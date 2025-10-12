import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import RecordingControl from "@/components/RecordingControl";
import FileUpload from "@/components/FileUpload";
import TranscriptionCard from "@/components/TranscriptionCard";
import SummaryCard from "@/components/SummaryCard";
import EmptyState from "@/components/EmptyState";
import LanguageSelector from "@/components/LanguageSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/LanguageProvider";
import { languageNames, type Language, type Session } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, History } from "lucide-react";
import { sessionStorage } from "@/utils/storage";

interface ProcessingResult {
  transcription: string;
  summary: string;
  keyPoints: string[];
  language: Language;
}

export default function Home() {
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [liveResult, setLiveResult] = useState<ProcessingResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    
    if (sessionId) {
      const session = sessionStorage.getById(sessionId);
      if (session) {
        setViewingSession(session);
        setResult({
          transcription: session.transcript,
          summary: session.summary,
          keyPoints: session.keyPoints || [],
          language: session.language,
        });
      } else {
        toast({
          title: "الجلسة غير موجودة",
          description: "لم يتم العثور على الجلسة المطلوبة",
          variant: "destructive",
        });
        navigate("/");
      }
    }
  }, [navigate, toast]);

  const generateSessionTitle = (summary: string): string => {
    const words = summary.trim().split(/\s+/).slice(0, 5);
    return words.join(" ") + (words.length >= 5 ? "..." : "");
  };

  const saveSession = (data: ProcessingResult) => {
    const session: Session = {
      id: Date.now().toString(),
      title: generateSessionTitle(data.summary),
      date: new Date().toISOString(),
      language: data.language,
      summary: data.summary,
      transcript: data.transcription,
      keyPoints: data.keyPoints,
    };

    sessionStorage.save(session);
  };

  const processAudio = async (audioBlob: Blob, filename: string = "recording.webm") => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      formData.append("language", language);

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
      };
      
      setResult(resultData);
      saveSession(resultData);

      toast({
        title: "تم التلخيص بنجاح",
        description: "تم تحويل الصوت إلى نص وتلخيصه وحفظه في السجل",
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

  const handleFileUpload = (file: File) => {
    processAudio(file, file.name);
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    setIsRecording(false);
    setLiveResult(null);
    processAudio(audioBlob, "recording.webm");
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
    </div>
  );
}
