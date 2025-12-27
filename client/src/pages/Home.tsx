import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecordingControl from "@/components/RecordingControl";
import FileUpload from "@/components/FileUpload";
import TranscriptionCard from "@/components/TranscriptionCard";
import SummaryCard from "@/components/SummaryCard";
import EmptyState from "@/components/EmptyState";
import LanguageSelector from "@/components/LanguageSelector";
import DailyLimitModal from "@/components/DailyLimitModal";
import TrialExpiredModal from "@/components/TrialExpiredModal";
import { getTrialStatus, type TrialStatus, TRIAL_CONFIG } from "@/services/localTrialService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/LanguageProvider";
import { languageNames, type Language, type Session } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, History, Loader2 } from "lucide-react";
import { getSummaryById } from "@/services/dbService";
import { useSubscription } from "@/components/SubscriptionProvider";
import { getUserStatus } from "@/services/userStatusService";
import { getAudioDuration } from "@/utils/audioUtils";

// ============================================================
// TRIAL DIAGNOSTIC LOGGING
// Logs trial state at each stage for debugging
// ============================================================
type TrialCheckStage = 'before_start' | 'after_transcription' | 'after_summary';

function logTrialCheck(
  stage: TrialCheckStage,
  status: TrialStatus,
  audioDuration?: number
) {
  console.log('[Trial Check]', {
    stage,
    usedMinutesToday: status.dailyMinutesUsed,
    dailyLimit: TRIAL_CONFIG.DAILY_LIMIT_MINUTES,
    dailyMinutesRemaining: status.dailyMinutesRemaining,
    totalMinutesUsed: status.minutesUsed,
    totalLimit: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
    totalMinutesRemaining: status.minutesRemaining,
    audioDuration: audioDuration ?? 'N/A',
    state: status.state,
    canUseTrial: status.canUseTrial,
  });
}

// ============================================================
// CENTRALIZED BLOCKING LOGIC
// Only checks if limits are ALREADY exhausted (from previous usage)
// Returns { allowed, blockReason } - does NOT block current operation
// ============================================================

// TEMPORARY: Set to true to bypass all trial checks for debugging
const TRIAL_BYPASS_ENABLED = true;

function canStartNewSummary(userId: string): { 
  allowed: boolean; 
  blockReason: 'daily_limit' | 'total_limit' | 'days_expired' | null;
  status: TrialStatus;
} {
  const status = getTrialStatus(userId);
  
  // Log at before_start stage
  logTrialCheck('before_start', status);
  
  // TEMPORARY BYPASS: Skip all trial checks for debugging
  if (TRIAL_BYPASS_ENABLED) {
    console.log('[canStartNewSummary] BYPASS ENABLED - allowing all requests');
    return { allowed: true, blockReason: null, status };
  }
  
  // MVP LOGIC: Only check date expiry and daily limit
  // totalMinutesUsed is for analytics only - NOT used for blocking
  
  // Check 1: Trial expired due to 7 days validity
  if (status.reason === 'days_expired') {
    return { allowed: false, blockReason: 'days_expired', status };
  }
  
  // Check 2: Daily limit is ALREADY exhausted (>= 30 min used today)
  if (status.dailyMinutesUsed >= TRIAL_CONFIG.DAILY_LIMIT_MINUTES) {
    return { allowed: false, blockReason: 'daily_limit', status };
  }
  
  // NO Check 3: totalMinutesUsed NOT used for blocking in MVP
  // Users get 30 minutes per day for 7 days (max = 210 minutes)
  
  // Limits not exhausted - allow operation to proceed
  return { allowed: true, blockReason: null, status };
}

interface ProcessingResult {
  transcription: string;
  summary: string;
  keyPoints: string[];
  language: Language;
  audioDuration?: number;
  processedAt?: string;
}

export default function Home() {
  const [, navigate] = useLocation();
  const { appUserId, loading: authLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [liveResult, setLiveResult] = useState<ProcessingResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [dailyLimitInfo, setDailyLimitInfo] = useState({ hours: 0, minutes: 0, used: 0 });
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);
  const [trialStatusForModal, setTrialStatusForModal] = useState<TrialStatus | null>(null);
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { recordUsage, refreshState } = useSubscription();

  const currentUserId = appUserId;

  // NOTE: We intentionally do NOT redirect when trial expires.
  // The user can still use the app, but the summarize ACTION will be blocked.
  // This provides a better UX - users can still browse, view history, etc.

  // Load summary from URL parameter
  useEffect(() => {
    if (!currentUserId) return;
    
    const params = new URLSearchParams(window.location.search);
    const summaryId = params.get('summary');
    const shouldPrint = params.get('print') === 'true';
    
    if (summaryId) {
      getSummaryById(summaryId, currentUserId).then((summary) => {
        if (summary) {
          setResult({
            transcription: summary.transcript || '',
            summary: summary.content,
            keyPoints: summary.key_points || [],
            language: summary.language,
          });

          if (shouldPrint) {
            setTimeout(() => {
              window.print();
              window.history.replaceState({}, '', `/?summary=${summaryId}`);
            }, 500);
          }
        } else {
          toast({
            title: "غير مصرح",
            description: "ليس لديك صلاحية لعرض هذا التلخيص",
            variant: "destructive",
          });
          navigate("/");
        }
      });
    }
  }, [currentUserId, navigate, toast]);

  // Show loading while checking auth
  if (authLoading || !currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const generateSessionTitle = (summary: string): string => {
    const words = summary.trim().split(/\s+/).slice(0, 5);
    return words.join(" ") + (words.length >= 5 ? "..." : "");
  };

  const processAudio = async (audioBlob: Blob, filename: string = "recording.webm", audioDuration?: number) => {
    // NOTE: We do NOT pre-check trial limits here
    // The current operation is always allowed to complete.
    // Server-side validation handles limit enforcement.
    // Blocking for NEXT attempt happens after processing completes.
    
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      formData.append("language", language);
      if (audioDuration) {
        formData.append("audioDuration", audioDuration.toString());
      }
      // Send userId for server-side trial validation
      if (currentUserId) {
        formData.append("userId", currentUserId);
      }

      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle server-side trial validation errors
        if (errorData.errorCode) {
          console.log(`[processAudio] Server rejected: ${errorData.errorCode}`);
          
          // Refresh local state to sync with server
          refreshState();
          
          if (errorData.errorCode === "DAILY_LIMIT_REACHED" || errorData.errorCode === "INSUFFICIENT_DAILY") {
            // Show daily limit modal
            const status = getUserStatus(currentUserId!);
            setDailyLimitInfo({
              hours: status.hoursUntilReset,
              minutes: status.minutesUntilReset,
              used: errorData.usage?.dailyMinutesUsed || 0,
            });
            setShowDailyLimitModal(true);
            setIsProcessing(false);
            return;
          } else if (errorData.errorCode === "TRIAL_EXHAUSTED" || errorData.errorCode === "INSUFFICIENT_TOTAL") {
            // Show trial expired modal
            setTrialStatusForModal(getTrialStatus(currentUserId!));
            setShowTrialExpiredModal(true);
            setIsProcessing(false);
            return;
          }
        }
        
        throw new Error(errorData.error || "فشلت معالجة الملف الصوتي");
      }

      const data = await response.json();
      
      // Log received response for debugging
      console.log('[processAudio] Response received from server:', {
        transcriptionLength: data.transcription?.length || 0,
        summaryLength: data.summary?.length || 0,
        keyPointsCount: data.keyPoints?.length || 0,
        savedSummaryId: data.savedSummaryId,
      });
      
      const resultData = {
        transcription: data.transcription,
        summary: data.summary,
        keyPoints: data.keyPoints || [],
        language: language,
        // Prefer server-calculated duration (null-safe), fallback to client only if server didn't provide
        audioDuration: data.audioDuration ?? audioDuration,
        // Include server timestamp for validation
        processedAt: data.processedAt,
      };
      
      console.log('[processAudio] Setting result state with summary:', resultData.summary?.substring(0, 100) + '...');
      setResult(resultData);
      
      // ============================================================
      // AFTER_SUMMARY STAGE: Record usage and check if NEXT attempt blocked
      // Use server-provided trial status (more accurate than local)
      // ============================================================
      const effectiveDuration = data.audioDuration ?? audioDuration;
      const audioDurationMinutes = effectiveDuration ? effectiveDuration / 60 : 0;
      
      // Use server-provided trial status if available
      const serverTrialStatus = data.trialStatus;
      
      // Record local usage for UX (server already tracked in database)
      if (effectiveDuration && effectiveDuration > 0) {
        try {
          recordUsage(audioDurationMinutes);
          console.log(`[processAudio] Local usage recorded: ${audioDurationMinutes.toFixed(2)} minutes`);
        } catch (error) {
          console.error("Error recording local usage:", error);
        }
      }
      
      // Log server-provided status
      console.log('[Trial Check] Server status after processing:', serverTrialStatus);
      
      // Check if NEXT attempt would be blocked (informational only - current operation completed)
      // Use server-provided info which is more accurate
      if (serverTrialStatus?.nextBlocked) {
        // Show appropriate modal based on block reason after delay (so user sees result first)
        if (serverTrialStatus.nextBlockReason === 'days_expired') {
          // Trial expired - show trial expired modal
          setTrialStatusForModal(getTrialStatus(currentUserId));
          setTimeout(() => setShowTrialExpiredModal(true), 1500);
        } else if (serverTrialStatus.nextBlockReason === 'daily_limit') {
          // Daily limit reached - show daily limit modal
          const status = getUserStatus(currentUserId);
          setDailyLimitInfo({
            hours: status.hoursUntilReset,
            minutes: status.minutesUntilReset,
            used: serverTrialStatus.dailyMinutesUsed || 0,
          });
          setTimeout(() => setShowDailyLimitModal(true), 1500);
        }
      }
      // NOTE: No total limit check in MVP - users get 30 min/day for 7 days
      
      // Check if server saved successfully
      if (data.savedSummaryId) {
        toast({
          title: "تم التلخيص بنجاح",
          description: "تم تحويل الصوت إلى نص وتلخيصه وحفظه في قاعدة البيانات",
        });
      } else {
        toast({
          title: "تم التلخيص",
          description: "تم تحويل الصوت إلى نص وتلخيصه (لم يتم الحفظ)",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error processing audio:", error);
      toast({
        title: "خطأ في المعالجة",
        description: error.message || "حدث خطأ أثناء معالجة الملف الصوتي",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    // ============================================================
    // BEFORE_START CHECK: Only block if limits ALREADY exhausted
    // ============================================================
    if (currentUserId) {
      const check = canStartNewSummary(currentUserId);
      if (!check.allowed) {
        console.log(`[handleFileUpload] BLOCKED at start: ${check.blockReason}`);
        
        if (check.blockReason === 'daily_limit') {
          const status = getUserStatus(currentUserId);
          setDailyLimitInfo({
            hours: status.hoursUntilReset,
            minutes: status.minutesUntilReset,
            used: check.status.dailyMinutesUsed,
          });
          setShowDailyLimitModal(true);
        } else {
          setTrialStatusForModal(check.status);
          setShowTrialExpiredModal(true);
        }
        return; // Block the action (but UI remains usable)
      }
    }
    
    try {
      // Calculate audio duration before processing
      const duration = await getAudioDuration(file);
      
      // Check duration limit (5 minutes = 300 seconds)
      if (duration > 300) {
        toast({
          title: "تنبيه",
          description: "مدة التسجيل الصوتي تتجاوز الحد المسموح (5 دقائق). يرجى تقصير التسجيل والمحاولة مرة أخرى.",
          variant: "destructive",
        });
        return;
      }
      
      // Limits not exhausted - proceed with processing
      processAudio(file, file.name, duration);
    } catch (error) {
      console.error("Error calculating audio duration:", error);
      toast({
        title: "خطأ",
        description: "فشل قراءة الملف الصوتي. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  const handleRecordingComplete = (audioBlob: Blob, duration: number) => {
    // NOTE: No blocking here - recording already in progress, must complete
    setIsRecording(false);
    setLiveResult(null);
    processAudio(audioBlob, "recording.webm", duration);
  };

  const handleLiveUpdate = (data: { transcription: string; summary: string; keyPoints: string[] }) => {
    setLiveResult({
      transcription: data.transcription,
      summary: data.summary,
      keyPoints: data.keyPoints,
      language: language,
    });
  };

  const handleRecordingStart = () => {
    // ============================================================
    // BEFORE_START CHECK: Only block if limits ALREADY exhausted
    // ============================================================
    if (currentUserId) {
      const check = canStartNewSummary(currentUserId);
      if (!check.allowed) {
        console.log(`[handleRecordingStart] BLOCKED at start: ${check.blockReason}`);
        
        if (check.blockReason === 'daily_limit') {
          const status = getUserStatus(currentUserId);
          setDailyLimitInfo({
            hours: status.hoursUntilReset,
            minutes: status.minutesUntilReset,
            used: check.status.dailyMinutesUsed,
          });
          setShowDailyLimitModal(true);
        } else {
          setTrialStatusForModal(check.status);
          setShowTrialExpiredModal(true);
        }
        return; // Block the action (but UI remains usable)
      }
    }
    
    // Limits not exhausted - start recording
    setIsRecording(true);
    setLiveResult(null);
    setResult(null);
    setViewingSession(null);
  };

  const handleNewRecording = () => {
    setResult(null);
    setLiveResult(null);
    setIsRecording(false);
    setViewingSession(null);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {!result ? (
            <>
              <EmptyState />

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate("/history")}
                  data-testid="button-view-history"
                >
                  <History className="h-4 w-4 ml-2" />
                  عرض سجل التلخيصات
                </Button>
              </div>

              <LanguageSelector value={language} onChange={setLanguage} />

              <Alert className="max-w-md mx-auto" data-testid="alert-language-info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  سيتم تلخيص المحاضرة بـ{language === "dz" ? "اللغة العربية" : languageNames[language]}
                </AlertDescription>
              </Alert>

              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-lg font-medium">جاري المعالجة...</p>
                  <p className="text-sm text-muted-foreground">
                    يتم تحويل الصوت إلى نص وتلخيصه
                  </p>
                </div>
              ) : (
                <Tabs defaultValue="record" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="record" data-testid="tab-record">
                      تسجيل صوتي
                    </TabsTrigger>
                    <TabsTrigger value="upload" data-testid="tab-upload">
                      رفع ملف
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="record" className="mt-8 space-y-8">
                    <RecordingControl 
                      onRecordingComplete={handleRecordingComplete}
                      onLiveUpdate={handleLiveUpdate}
                      onRecordingStart={handleRecordingStart}
                      language={language}
                    />

                    {isRecording && liveResult && (
                      <div className="space-y-4 mt-8">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                          <h3 className="text-lg font-semibold">التلخيص اللحظي</h3>
                          <Badge variant="secondary" className="mr-auto">
                            تحديث تلقائي
                          </Badge>
                        </div>

                        {liveResult.transcription && (
                          <TranscriptionCard text={liveResult.transcription} />
                        )}

                        {liveResult.summary && (
                          <SummaryCard
                            summary={liveResult.summary}
                            keyPoints={liveResult.keyPoints}
                            language={liveResult.language}
                            title="معاينة-مباشرة"
                            date={new Date().toISOString()}
                          />
                        )}

                        {!liveResult.transcription && !liveResult.summary && (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>جاري معالجة الصوت...</p>
                            <p className="text-sm mt-2">سيظهر التلخيص خلال ثوانٍ</p>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="upload" className="mt-8">
                    <FileUpload onFileSelect={handleFileUpload} />
                  </TabsContent>
                </Tabs>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-semibold">
                  {viewingSession ? "جلسة محفوظة" : "النتائج"}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/history")}
                    data-testid="button-view-history-from-result"
                  >
                    <History className="h-4 w-4 ml-2" />
                    السجل
                  </Button>
                  <button
                    onClick={handleNewRecording}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-new-recording"
                  >
                    تسجيل جديد ←
                  </button>
                </div>
              </div>

              <TranscriptionCard text={result.transcription} />

              <SummaryCard
                summary={result.summary}
                keyPoints={result.keyPoints}
                language={result.language}
                title={viewingSession?.title || generateSessionTitle(result.summary)}
                date={viewingSession?.date || new Date().toISOString()}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />

      <DailyLimitModal
        open={showDailyLimitModal}
        onClose={() => setShowDailyLimitModal(false)}
        hoursUntilReset={dailyLimitInfo.hours}
        minutesUntilReset={dailyLimitInfo.minutes}
        dailyMinutesUsed={dailyLimitInfo.used}
      />

      <TrialExpiredModal
        open={showTrialExpiredModal}
        onClose={() => setShowTrialExpiredModal(false)}
        trialStatus={trialStatusForModal}
      />
    </div>
  );
}
