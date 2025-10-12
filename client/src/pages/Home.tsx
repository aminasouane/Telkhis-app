import { useState } from "react";
import Header from "@/components/Header";
import RecordingControl from "@/components/RecordingControl";
import FileUpload from "@/components/FileUpload";
import TranscriptionCard from "@/components/TranscriptionCard";
import SummaryCard from "@/components/SummaryCard";
import EmptyState from "@/components/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  // TODO: remove mock functionality - replace with real API calls
  const [hasResults, setHasResults] = useState(false);

  // Mock data for demonstration
  const mockTranscript = {
    text: "مرحباً بكم في محاضرة اليوم حول الذكاء الاصطناعي وتطبيقاته في العالم الحديث. سنبدأ بمقدمة عن التعلم الآلي والفرق بينه وبين التعلم العميق. الذكاء الاصطناعي أصبح جزءاً أساسياً من حياتنا اليومية، من التوصيات في منصات التواصل الاجتماعي إلى السيارات ذاتية القيادة.",
    timestamps: [
      { time: "00:00", text: "مرحباً بكم في محاضرة اليوم حول الذكاء الاصطناعي وتطبيقاته في العالم الحديث." },
      { time: "00:08", text: "سنبدأ بمقدمة عن التعلم الآلي والفرق بينه وبين التعلم العميق." },
      { time: "00:15", text: "الذكاء الاصطناعي أصبح جزءاً أساسياً من حياتنا اليومية، من التوصيات في منصات التواصل الاجتماعي إلى السيارات ذاتية القيادة." },
    ],
  };

  const mockSummary = {
    summary: "تناولت المحاضرة موضوع الذكاء الاصطناعي وتطبيقاته المتنوعة في العالم الحديث، مع التركيز على الفرق بين التعلم الآلي والتعلم العميق، وكيف أصبح الذكاء الاصطناعي جزءاً لا يتجزأ من حياتنا اليومية في مختلف المجالات.",
    keyPoints: [
      "الذكاء الاصطناعي جزء أساسي من التقنيات الحديثة",
      "الفرق بين التعلم الآلي والتعلم العميق",
      "تطبيقات عملية في الحياة اليومية من وسائل التواصل إلى السيارات الذكية",
    ],
  };

  // Simulate showing results when user interacts
  const handleShowMockResults = () => {
    setTimeout(() => {
      setHasResults(true);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {!hasResults ? (
            <>
              <EmptyState />

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
                  <div onClick={handleShowMockResults}>
                    <RecordingControl />
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-8">
                  <div onClick={handleShowMockResults}>
                    <FileUpload />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-semibold">النتائج</h2>
                <button
                  onClick={() => setHasResults(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-new-recording"
                >
                  تسجيل جديد ←
                </button>
              </div>

              <TranscriptionCard
                text={mockTranscript.text}
                timestamps={mockTranscript.timestamps}
              />

              <SummaryCard
                summary={mockSummary.summary}
                keyPoints={mockSummary.keyPoints}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
