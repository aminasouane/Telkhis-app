import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, RefreshCw, Sparkles } from "lucide-react";
import { TRIAL_CONFIG } from "@/config/trialConfig";
import { useToast } from "@/hooks/use-toast";

interface DailyLimitModalProps {
  open: boolean;
  onClose: () => void;
  hoursUntilReset: number;
  minutesUntilReset: number;
}

export default function DailyLimitModal({
  open,
  onClose,
  hoursUntilReset,
  minutesUntilReset,
}: DailyLimitModalProps) {
  const { toast } = useToast();
  
  const formatResetTime = () => {
    if (hoursUntilReset > 0) {
      return `${hoursUntilReset} ساعة و ${minutesUntilReset} دقيقة`;
    }
    return `${minutesUntilReset} دقيقة`;
  };

  const handleUpgrade = () => {
    onClose();
    toast({
      title: "الاشتراكات المدفوعة قادمة قريبًا",
      description: "نحن نعمل حاليًا على تجهيزها، شكرًا لاهتمامك!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 mb-4">
            <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center text-xl">
            تم استهلاك الحد اليومي للتلخيص
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-center space-y-4 pt-3">
              <p className="text-base">
                لقد وصلت إلى الحد اليومي ({TRIAL_CONFIG.DAILY_LIMIT_MINUTES} دقيقة)
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <span>
                    يتم تجديد {TRIAL_CONFIG.DAILY_LIMIT_MINUTES} دقيقة تلقائيًا غدًا
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>الوقت المتبقي: {formatResetTime()}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                يمكنك المتابعة غدًا أو الترقية عند توفر الاشتراكات
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-4">
          <Button
            onClick={handleUpgrade}
            variant="default"
            data-testid="button-upgrade-daily-limit"
          >
            <Sparkles className="h-4 w-4 ml-2" />
            الترقية للحصول على المزيد
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            data-testid="button-close-daily-limit"
          >
            حسنًا، سأعود غدًا
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
