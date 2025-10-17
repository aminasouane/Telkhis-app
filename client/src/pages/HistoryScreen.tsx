import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";
import HistoryList from "@/components/HistoryList";
import { Button } from "@/components/ui/button";
import { Plus, History, Loader2 } from "lucide-react";
import { type Session } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getSummaries, deleteSummary } from "@/services/dbService";

export default function HistoryScreen() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Load summaries from database
  useEffect(() => {
    if (!user) return;

    const loadSummaries = async () => {
      setLoading(true);
      const summaries = await getSummaries(user.id);
      
      // Convert summaries to Session format
      const sessionsList: Session[] = summaries.map(summary => ({
        id: summary.id!,
        title: summary.title || '',
        date: summary.created_at || new Date().toISOString(),
        language: summary.language,
        summary: summary.content,
        transcript: summary.transcript || '',
        keyPoints: summary.key_points || []
      }));
      
      setSessions(sessionsList);
      setLoading(false);
    };

    loadSummaries();
  }, [user]);

  const handleOpenSession = (session: Session) => {
    navigate(`/?summary=${session.id}`);
  };

  const handlePrintSession = (session: Session) => {
    navigate(`/?summary=${session.id}&print=true`);
  };

  const handleDeleteSession = async (id: string) => {
    if (!user) return;
    
    const success = await deleteSummary(id, user.id);
    
    if (success) {
      setSessions(sessions.filter(s => s.id !== id));
      toast({
        title: "تم الحذف",
        description: "تم حذف التلخيص من قاعدة البيانات",
      });
    } else {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف التلخيص",
        variant: "destructive",
      });
    }
  };

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="w-full sm:w-auto min-w-[200px]"
              data-testid="button-new-recording"
            >
              <Plus className="h-5 w-5 ml-2" />
              تسجيل محاضرة جديدة
            </Button>

            <Button
              size="lg"
              variant="secondary"
              disabled
              className="w-full sm:w-auto min-w-[200px]"
              data-testid="button-history"
            >
              <History className="h-5 w-5 ml-2" />
              سجل التلخيصات (الصفحة الحالية)
            </Button>
          </div>

          <div className="mt-12">
            <HistoryList
              sessions={sessions}
              onOpenSession={handleOpenSession}
              onPrintSession={handlePrintSession}
              onDeleteSession={handleDeleteSession}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
