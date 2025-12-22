import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, FileText, Calendar } from "lucide-react";
import { type TrialStatus } from "@/services/localTrialService";
import { TRIAL_CONFIG } from "@/config/trialConfig";

interface TrialExpiredModalProps {
  open: boolean;
  trialStatus: TrialStatus | null;
}

export default function TrialExpiredModal({
  open,
  trialStatus
}: TrialExpiredModalProps) {
  const [, navigate] = useLocation();

  const handleContinue = () => {
    navigate("/history");
  };

  const getTitle = () => {
    if (!trialStatus) return "انتهت تجربتك المجانية";
    
    switch (trialStatus.state) {
      case "USED_UP":
        // Limits exhausted (summaries or minutes) but days may remain
        return "استهلكت رصيدك المجاني";
      case "EXPIRED":
        // 7 days passed since first use
        return "انتهت صلاحية التجربة";
      default:
        return "انتهت تجربتك المجانية";
    }
  };

  const getExpiryReason = () => {
    if (!trialStatus) return null;
    
    switch (trialStatus.reason) {
      case "summaries_exhausted":
        return "لقد استخدمت تلخيصك المجاني الوحيد. اشترك للحصول على المزيد من التلخيصات.";
      case "time_expired":
        return `لقد استخدمت كامل الوقت المجاني (${TRIAL_CONFIG.MAX_AUDIO_MINUTES} دقيقة). اشترك للحصول على وقت إضافي.`;
      case "days_expired":
        return `انتهت صلاحية التجربة المجانية بعد ${TRIAL_CONFIG.VALIDITY_DAYS} أيام من أول استخدام.`;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">{getTitle()}</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed" dir="rtl">
            نأمل أن تكون قد استفدت من تلخيصلي. يمكنك الترقية قريبًا لمتابعة استخدام جميع الميزات.
            {getExpiryReason() && (
              <>
                <br />
                <br />
                <span className="text-sm">{getExpiryReason()}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {trialStatus && (
          <div className="bg-muted/50 p-4 rounded-lg mt-4 space-y-2" dir="rtl">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                التلخيصات: {trialStatus.summariesUsed} من {trialStatus.summariesLimit}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                الوقت: {trialStatus.minutesUsed.toFixed(1)} من {trialStatus.minutesLimit} دقيقة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                الأيام المتبقية: {Math.max(0, trialStatus.daysRemaining)}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            onClick={handleContinue}
            variant="outline"
            className="w-full"
            data-testid="button-continue-trial"
          >
            <Sparkles className="h-4 w-4 ml-2" />
            سيتم فتح الاشتراك قريبًا — متابعة التصفح
          </Button>
        </DialogFooter>
        
        <p className="text-xs text-muted-foreground text-center">
          سنُعلمك فور توفر خطط الاشتراك. شكرًا لاستخدامك تلخيصلي!
        </p>
      </DialogContent>
    </Dialog>
  );
}
