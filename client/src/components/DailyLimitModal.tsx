import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import { TRIAL_CONFIG } from "@/config/trialConfig";

interface DailyLimitModalProps {
  open: boolean;
  onClose: () => void;
  hoursUntilReset: number;
  minutesUntilReset: number;
  dailyMinutesUsed: number;
}

export default function DailyLimitModal({
  open,
  onClose,
  hoursUntilReset,
  minutesUntilReset,
  dailyMinutesUsed,
}: DailyLimitModalProps) {
  const formatResetTime = () => {
    if (hoursUntilReset > 0) {
      return `${hoursUntilReset} ساعة و ${minutesUntilReset} دقيقة`;
    }
    return `${minutesUntilReset} دقيقة`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 mb-4">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center text-xl">
            انتهى الحد اليومي
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-2">
            <p>
              لقد استخدمت الحد اليومي المسموح ({TRIAL_CONFIG.DAILY_LIMIT_MINUTES} دقائق).
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                يمكنك المحاولة مجددًا بعد: <strong>{formatResetTime()}</strong>
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              تم تصميم الحد اليومي لتوزيع استخدامك على مدار فترة التجربة.
              <br />
              الرصيد الإجمالي: {TRIAL_CONFIG.MAX_AUDIO_MINUTES} دقيقة خلال {TRIAL_CONFIG.VALIDITY_DAYS} أيام.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            data-testid="button-close-daily-limit"
          >
            حسنًا، فهمت
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
