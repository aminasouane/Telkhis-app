import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Eye, Trash2, Calendar, Printer } from "lucide-react";
import { Session, languageNames } from "@shared/schema";
import { format } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { useLanguage } from "@/components/LanguageProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface HistoryListProps {
  sessions: Session[];
  onOpenSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
  onPrintSession?: (session: Session) => void;
}

export default function HistoryList({ sessions, onOpenSession, onDeleteSession, onPrintSession }: HistoryListProps) {
  const { language } = useLanguage();
  
  const getLocale = () => {
    if (language === "fr") return fr;
    return ar;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "PPp", { locale: getLocale() });
    } catch {
      return dateString;
    }
  };

  if (sessions.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
          <History className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            لا توجد تلخيصات محفوظة بعد
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">سجل التلخيصات</h3>
        <span className="text-sm text-muted-foreground">({sessions.length})</span>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <Card key={session.id} className="hover-elevate printable-card" data-testid={`session-card-${session.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-semibold truncate mb-2" data-testid={`session-title-${session.id}`}>
                    {session.title}
                  </CardTitle>
                  <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span data-testid={`session-date-${session.id}`}>{formatDate(session.date)}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-muted text-xs" data-testid={`session-language-${session.id}`}>
                      {languageNames[session.language]}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenSession(session)}
                    data-testid={`button-open-session-${session.id}`}
                    className="hover-elevate active-elevate-2"
                  >
                    <Eye className="h-4 w-4 ml-2" />
                    فتح
                  </Button>

                  {onPrintSession && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPrintSession(session)}
                      data-testid={`button-print-session-${session.id}`}
                      className="hover-elevate active-elevate-2 print:hidden"
                    >
                      <Printer className="h-4 w-4 ml-2" />
                      طباعة
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-delete-session-${session.id}`}
                        className="hover-elevate active-elevate-2"
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف هذا التلخيص نهائياً ولن يمكن استرجاعه.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteSession(session.id)}
                          data-testid="button-confirm-delete"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
