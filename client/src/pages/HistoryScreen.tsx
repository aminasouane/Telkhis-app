import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import HistoryList from "@/components/HistoryList";
import { Button } from "@/components/ui/button";
import { Plus, History } from "lucide-react";
import { sessionStorage } from "@/utils/storage";
import { type Session } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function HistoryScreen() {
  const [, navigate] = useLocation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadedSessions = sessionStorage.getAll().map(session => ({
      ...session,
      keyPoints: session.keyPoints || []
    }));
    setSessions(loadedSessions);
  }, []);

  const handleOpenSession = (session: Session) => {
    navigate(`/?session=${session.id}`);
  };

  const handleDeleteSession = (id: string) => {
    sessionStorage.delete(id);
    setSessions(sessionStorage.getAll().map(session => ({
      ...session,
      keyPoints: session.keyPoints || []
    })));
    
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
              onDeleteSession={handleDeleteSession}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
