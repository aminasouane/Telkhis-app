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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/LanguageProvider";
import { languageNames, type Language, type Session } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, History, Loader2 } from "lucide-react";
import { getSummaryById, saveSummary as dbSaveSummary } from "@/services/dbService";
import { useSubscription } from "@/components/SubscriptionProvider";
import { canProcessAudio, type BlockReason } from "@/services/localTrialService";
import { getUserStatus, shouldShowSubscriptionPage } from "@/services/userStatusService";
import { getAudioDuration } from "@/utils/audioUtils";

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
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { recordUsage, refreshState } = useSubscription();

  const currentUserId = appUserId;

  // Redirect to /subscribe if trial is expired or minutes exhausted
  useEffect(() => {
    if (!authLoading && currentUserId) {
      if (shouldShowSubscriptionPage(currentUserId)) {
        navigate("/subscribe");
      }
    }
  }, [authLoading, currentUserId, navigate]);

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

  const saveSessionToDatabase = async (data: ProcessingResult, originalDuration?: number): Promise<boolean> => {
    if (!currentUserId) return false;

    // IMPORTANT: Server duration is authoritative, client duration is fallback only
    // Server calculates duration from the actual audio file, not client-provided value
    const effectiveDuration = data.audioDuration ?? originalDuration;
    
    if (!effectiveDuration || effectiveDuration <= 0) {
      console.error("Missing or invalid audioDuration - this should not happen!");
      // If no duration available, we still need to record SOME usage to prevent bypass
    }
    
    console.log(`[saveSession] Using duration: ${effectiveDuration?.toFixed(2) ?? 'N/A'}s`);

    // Save to database FIRST before recording usage
    const title = generateSessionTitle(data.summary);
    const saved = await dbSaveSummary({
      user_id: currentUserId,
      title,
      content: data.summary,
      transcript: data.transcription,
      key_points: data.keyPoints,
      language: data.language,
    });
    
    if (!saved) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التلخيص. لم يتم احتساب الاستخدام.",
        variant: "destructive",
      });
      return false;
    }

    // Only record usage AFTER successful database save
    // IMPORTANT: Always record usage if we have duration to prevent bypass
    if (effectiveDuration && effectiveDuration > 0) {
      // audioDuration comes in SECONDS, convert to minutes
      const audioDurationMinutes = effectiveDuration / 60;
      
      try {
        recordUsage(audioDurationMinutes);
        console.log(`Usage recorded: ${audioDurationMinutes.toFixed(2)} minutes`);
      } catch (error) {
        console.error("Error recording usage:", error);
        // Usage recording failed but save succeeded - log but don't block
      }
    } else {
      // If no duration available, record minimal usage (1 second = 0.0167 minutes)
      // This prevents completely free usage in edge cases
      console.warn("No duration available - recording minimal usage");
      try {
        recordUsage(0.1); // 6 seconds minimum
      } catch (error) {
        console.error("Error recording minimal usage:", error);
      }
    }
    
    return true;
  };

  const processAudio = async (audioBlob: Blob, filename: string = "recording.webm", audioDuration?: number) => {
    // Check if user can process this specific audio duration
    if (currentUserId) {
      const audioDurationMinutes = audioDuration ? audioDuration / 60 : 0.1;
      const permissionCheck = canProcessAudio(currentUserId, audioDurationMinutes);
      
      if (!permissionCheck.allowed) {
        toast({
          title: "لا يمكن معالجة الملف",
          description: permissionCheck.reason || "الرصيد المتبقي غير كافٍ لمعالجة هذا الملف",
          variant: "destructive",
        });
        refreshState();
        
        // Handle different block reasons differently
        if (permissionCheck.blockReason === "daily_limit") {
          // Show modal for daily limit - user can try tomorrow
          const status = getUserStatus(currentUserId);
          setDailyLimitInfo({
            hours: status.hoursUntilReset,
            minutes: status.minutesUntilReset,
            used: permissionCheck.status.dailyMinutesUsed,
          });
          setShowDailyLimitModal(true);
        } else {
          // Redirect to subscription page for trial expiration or total limit
          navigate("/subscribe");
        }
        return;
      }
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      formData.append("language", language);
      if (audioDuration) {
        formData.append("audioDuration", audioDuration.toString());
      }

      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشلت معالجة الملف الصوتي");
      }

      const data = await response.json();
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
      
      setResult(resultData);
      await saveSessionToDatabase(resultData, audioDuration);

      toast({
        title: "تم التلخيص بنجاح",
        description: "تم تحويل الصوت إلى نص وتلخيصه وحفظه في قاعدة البيانات",
      });
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
    </div>
  );
}
