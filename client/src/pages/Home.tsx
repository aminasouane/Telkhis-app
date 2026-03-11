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
import TrialExpiredModal from "@/components/TrialExpiredModal";
import DailyLimitModal from "@/components/DailyLimitModal";
import { useUserStatus } from "@/hooks/useUserStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/LanguageProvider";
import { type Language, type Session } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { History, Loader2, Globe, ArrowLeft } from "lucide-react";
import { getSummaryById } from "@/services/dbService";
import { useSubscription } from "@/components/SubscriptionProvider";
import { getAudioDuration } from "@/utils/audioUtils";
import {
  SUPPORTED_LANGUAGES,
  type Language as LanguageConfig
} from "@shared/languages";

const LANGUAGE_STORAGE_KEY = 'takhleesly_language';



interface ProcessingResult {
  transcription: string;
  summary: string;
  keyPoints: string[];
  language: Language;
  audioDuration?: number;
  processedAt?: string;
  error?: string;
}

// ============================================================
// WELCOME SCREEN COMPONENT
// Shows summary language selection - UI always in Arabic
// ============================================================
function WelcomeScreen({
  onComplete,
  selectedLanguage,
  onLanguageChange
}: {
  onComplete: () => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
}) {
  // UI is always in Arabic (RTL), only summary output uses selectedLanguage
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary" data-testid="text-app-name">
            تلخيصلي
          </CardTitle>
          <CardDescription className="text-lg" data-testid="text-welcome">
            مرحباً بك
          </CardDescription>
          <p className="text-sm text-muted-foreground" data-testid="text-welcome-message">
            لخّص محاضراتك بسرعة وسهولة باستخدام الذكاء الاصطناعي
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              اختر لغة التلخيص
            </Label>

            <RadioGroup
              value={selectedLanguage}
              onValueChange={onLanguageChange}
              className="grid gap-2"
            >
              {SUPPORTED_LANGUAGES.map((lang: LanguageConfig) => (
                <div
                  key={lang.code}
                  className={`flex items-center space-x-3 space-x-reverse rounded-lg border p-3 cursor-pointer transition-colors hover-elevate ${selectedLanguage === lang.code
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                    }`}
                  onClick={() => onLanguageChange(lang.code)}
                  data-testid={`radio-language-${lang.code}`}
                >
                  <RadioGroupItem value={lang.code} id={`welcome-${lang.code}`} />
                  <Label
                    htmlFor={`welcome-${lang.code}`}
                    className="flex-1 cursor-pointer flex justify-between items-center"
                  >
                    <span className="font-medium">{lang.nativeName}</span>
                    <span className="text-xs text-muted-foreground">{lang.name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="text-center space-y-2 text-sm text-muted-foreground">
            <p>لا حاجة لتسجيل الدخول</p>
            <p>بياناتك محفوظة محلياً على جهازك</p>
          </div>

          <Button
            onClick={onComplete}
            className="w-full gap-2"
            size="lg"
            data-testid="button-start"
          >
            ابدأ الآن
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { appUserId, loading: authLoading, isAuthenticated, showAuthModal, session } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [liveResult, setLiveResult] = useState<ProcessingResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [dailyLimitInfo, setDailyLimitInfo] = useState({ hours: 0, minutes: 0, used: 0 });
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { refetch: refetchStatus, status: userStatus } = useUserStatus();

  const currentUserId = appUserId;

  // NOTE: We intentionally do NOT redirect when trial expires.
  // The user can still use the app, but the summarize ACTION will be blocked.
  // This provides a better UX - users can still browse, view history, etc.

  // Load summary from URL parameter - must be before any early returns to follow React hooks rules
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

  // Show loading only while auth is resolving
  if (authLoading) {
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

    console.log('[FLOW] processAudio START - sending audio to server');
    console.log(`[FLOW] Audio size: ${audioBlob.size} bytes, duration: ${audioDuration}s`);

    // Client-side pre-check: warn before upload if duration known and exceeds daily limit
    const dailyLimitSeconds = (userStatus.dailyMinutesLimit || 45) * 60;
    if (audioDuration && audioDuration > dailyLimitSeconds) {
      toast({
        title: "⏱️ مدة التسجيل طويلة جداً",
        description: `الحد الأقصى لكل جلسة هو ${userStatus.dailyMinutesLimit || 45} دقيقة. مدة ملفك: ${Math.ceil(audioDuration / 60)} دقيقة. يُرجى تقسيم التسجيل لأجزاء أصغر.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      formData.append("language", language);
      if (audioDuration) {
        formData.append("audioDuration", audioDuration.toString());
      }
      if (currentUserId) {
        formData.append("userId", currentUserId);
      }

      // Build auth headers
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      console.log('[FLOW] Sending fetch request to /api/process-audio...');
      const response = await fetch("/api/process-audio", {
        method: "POST",
        headers,
        body: formData,
      });
      console.log(`[FLOW] Received response: status=${response.status}, ok=${response.ok}`);

      if (!response.ok) {
        const errorData = await response.json();

        // Handle server-side trial validation errors
        if (errorData.errorCode) {
          console.log(`[processAudio] Server rejected: ${errorData.errorCode}`);

          // Refresh Supabase status
          refetchStatus();

          // Show daily limit modal
          if (errorData.errorCode === "TRIAL_DAILY_LIMIT_REACHED") {
            const now = new Date();
            const midnight = new Date();
            midnight.setDate(midnight.getDate() + 1);
            midnight.setHours(0, 0, 0, 0);
            const diff = midnight.getTime() - now.getTime();
            setDailyLimitInfo({
              hours: Math.floor(diff / (1000 * 60 * 60)),
              minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
              used: errorData.usage?.dailyMinutesUsed || 0,
            });
            setShowDailyLimitModal(true);
            setIsProcessing(false);
            return;
          }

          // Show trial expired modal for total limit or days expired
          if (errorData.errorCode === "TRIAL_TOTAL_LIMIT_REACHED" ||
            errorData.errorCode === "TRIAL_DAYS_EXPIRED" ||
            errorData.errorCode === "TRIAL_EXHAUSTED") {
            setShowTrialExpiredModal(true);
            setIsProcessing(false);
            return;
          }
        }

        // Show friendly message for duration limit
        if (errorData.errorCode === "DURATION_EXCEEDED") {
          toast({
            title: "⏱️ مدة التسجيل طويلة جداً",
            description: `الحد الأقصى لكل جلسة هو ${userStatus.dailyMinutesLimit || 45} دقيقة. مدة ملفك: ${Math.ceil((errorData.duration || 0) / 60)} دقيقة. يُرجى تقسيم التسجيل لأجزاء أصغر.`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
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

      // After successful processing, refresh status from Supabase
      refetchStatus();

      // Check if NEXT attempt would be blocked (from server response)
      if (serverTrialStatus?.nextBlocked) {
        setTimeout(() => setShowTrialExpiredModal(true), 1500);
      }

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
      console.error("[FLOW] ERROR in processAudio:", error);

      // Set error result so user knows what happened
      setResult({
        transcription: "",
        summary: "",
        keyPoints: [],
        language: language,
        audioDuration: audioDuration,
        error: error.message || "حدث خطأ أثناء معالجة الملف الصوتي",
      });

      toast({
        title: "خطأ في المعالجة",
        description: error.message || "حدث خطأ أثناء معالجة الملف الصوتي. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      console.log('[FLOW] processAudio COMPLETE - setting isProcessing=false');
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Require authentication before processing
    if (!isAuthenticated) {
      showAuthModal('signup');
      return;
    }

    // ============================================================
    // BEFORE_START CHECK: Block if trial limits exhausted
    // ============================================================
    // Check server-side status (from Supabase — cannot be manipulated)
    if (!userStatus.canProcess) {
      console.log(`[handleFileUpload] BLOCKED: ${userStatus.blockReason}`);

      if (userStatus.blockReason === 'daily_limit') {
        const now = new Date();
        const midnight = new Date();
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);
        const diff = midnight.getTime() - now.getTime();
        setDailyLimitInfo({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          used: userStatus.dailyMinutesUsed,
        });
        setShowDailyLimitModal(true);
      } else {
        setShowTrialExpiredModal(true);
      }
      return;
    }

    try {
      // Calculate audio duration before processing
      const duration = await getAudioDuration(file);

      // Client-side pre-check: warn if duration exceeds limits
      const dailyLimitSeconds = (userStatus.dailyMinutesLimit || 45) * 60;
      if (duration > dailyLimitSeconds) {
        toast({
          title: "⏱️ مدة التسجيل طويلة جداً",
          description: `الحد الأقصى للتسجيل هو ${userStatus.dailyMinutesLimit || 45} دقيقة. مدة ملفك: ${Math.ceil(duration / 60)} دقيقة. يُرجى تقسيم التسجيل لأجزاء أصغر.`,
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

  // ============================================================
  // PRE-FLIGHT CHECK: Called BEFORE microphone is activated
  // Returns true if recording is allowed, false to block
  // Handles: daily_limit, total_limit, days_expired
  // ============================================================
  const handleBeforeRecording = (): boolean => {
    // Require authentication before recording
    if (!isAuthenticated) {
      showAuthModal('signup');
      return false;
    }

    // Use server-side status from Supabase (no localStorage)
    if (!userStatus.canProcess) {
      console.log(`[handleBeforeRecording] BLOCKED: ${userStatus.blockReason}`);

      if (userStatus.blockReason === 'daily_limit') {
        // Calculate hours until midnight reset
        const now = new Date();
        const midnight = new Date();
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);
        const diff = midnight.getTime() - now.getTime();
        const hoursUntilReset = Math.floor(diff / (1000 * 60 * 60));
        const minutesUntilReset = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        setDailyLimitInfo({
          hours: hoursUntilReset,
          minutes: minutesUntilReset,
          used: userStatus.dailyMinutesUsed,
        });
        setShowDailyLimitModal(true);
      } else {
        setShowTrialExpiredModal(true);
      }
      return false;
    }

    return true;
  };

  const handleRecordingStart = () => {
    // Called AFTER recording has started - set UI state
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
                  onClick={() => navigate("/dashboard")}
                  data-testid="button-view-history"
                >
                  <History className="h-4 w-4 ml-2" />
                  عرض سجل التلخيصات
                </Button>
              </div>

              {isProcessing ? (
                <div className="flex flex-col items-center gap-6 py-12 px-4">
                  <div className="relative">
                    <div className="h-20 w-20 border-4 border-primary/30 rounded-full" />
                    <div className="absolute inset-0 h-20 w-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="text-center space-y-3">
                    <p className="text-xl font-semibold text-foreground">
                      يتم الآن معالجة التسجيل وإنشاء التلخيص
                    </p>
                    <p className="text-muted-foreground">
                      قد يستغرق ذلك من دقيقة إلى 3 دقائق حسب طول التسجيل
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>يرجى الانتظار وعدم إغلاق الصفحة</span>
                    </div>
                  </div>
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

                  {/* Duration limit info */}
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    ⏱️ الحد الأقصى لكل جلسة: <span className="font-medium text-foreground">{userStatus.dailyMinutesLimit || 45} دقيقة</span> — لتسجيلات أطول يُرجى تقسيمها إلى أجزاء
                  </p>

                  <TabsContent value="record" className="mt-8 space-y-8">
                    <RecordingControl
                      onRecordingComplete={handleRecordingComplete}
                      onLiveUpdate={handleLiveUpdate}
                      onBeforeRecording={handleBeforeRecording}
                      onRecordingStart={handleRecordingStart}
                      language={language}
                    />

                    {isRecording && liveResult && (
                      <div className="space-y-4 mt-8">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                          <h3 className="text-lg font-semibold">التلخيص اللحظي</h3>
                          <Badge variant="secondary" className="me-auto">
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
                    onClick={() => navigate("/dashboard")}
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
                    تسجيل جديد
                  </button>
                </div>
              </div>

              {result.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              ) : (
                <>
                  {result.transcription && (
                    <TranscriptionCard text={result.transcription} />
                  )}
                  <SummaryCard
                    summary={result.summary}
                    keyPoints={result.keyPoints}
                    language={result.language}
                    title={generateSessionTitle(result.summary)}
                    date={result.processedAt || new Date().toISOString()}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <TrialExpiredModal
        open={showTrialExpiredModal}
        onClose={() => setShowTrialExpiredModal(false)}
        trialStatus={null}
      />

      <DailyLimitModal
        open={showDailyLimitModal}
        onClose={() => setShowDailyLimitModal(false)}
        hoursUntilReset={dailyLimitInfo.hours}
        minutesUntilReset={dailyLimitInfo.minutes}
      />
    </div>
  );
}
