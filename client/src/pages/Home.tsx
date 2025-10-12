import { useState, useEffect } from "react";
import Header from "@/components/Header";
import RecordingControl from "@/components/RecordingControl";
import FileUpload from "@/components/FileUpload";
import TranscriptionCard from "@/components/TranscriptionCard";
import SummaryCard from "@/components/SummaryCard";
import EmptyState from "@/components/EmptyState";
import LanguageSelector from "@/components/LanguageSelector";
import HistoryList from "@/components/HistoryList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/LanguageProvider";
import { languageNames, type Language, type Session } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { sessionStorage } from "@/utils/storage";

interface ProcessingResult {
  transcription: string;
  summary: string;
  keyPoints: string[];
  language: Language;
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    const loadedSessions = sessionStorage.getAll().map(session => ({
      ...session,
      keyPoints: session.keyPoints || []
    }));
    setSessions(loadedSessions);
  }, []);

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
    setSessions(sessionStorage.getAll());
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
    processAudio(audioBlob, "recording.webm");
  };

  const handleNewRecording = () => {
    setResult(null);
    setViewingSession(null);
  };

  const handleOpenSession = (session: Session) => {
    setViewingSession(session);
    setResult({
      transcription: session.transcript,
      summary: session.summary,
      keyPoints: session.keyPoints || [],
      language: session.language,
    });
    setActiveTab("new");
  };

  const handleDeleteSession = (id: string) => {
    sessionStorage.delete(id);
    setSessions(sessionStorage.getAll());
    
    if (viewingSession?.id === id) {
      setViewingSession(null);
      setResult(null);
    }
    
    toast({
      title: "تم الحذف",
      description: "تم حذف التلخيص من السجل",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "new" | "history")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="new" data-testid="tab-main-new">
                تسجيل جديد
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-main-history">
                سجل التلخيصات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-8 space-y-8">
              {!result ? (
                <>
                  <EmptyState />

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

                      <TabsContent value="record" className="mt-8">
                        <RecordingControl onRecordingComplete={handleRecordingComplete} />
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
                    <button
                      onClick={handleNewRecording}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-new-recording"
                    >
                      تسجيل جديد ←
                    </button>
                  </div>

                  <TranscriptionCard text={result.transcription} />

                  <SummaryCard
                    summary={result.summary}
                    keyPoints={result.keyPoints}
                    language={result.language}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-8">
              <HistoryList
                sessions={sessions}
                onOpenSession={handleOpenSession}
                onDeleteSession={handleDeleteSession}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
