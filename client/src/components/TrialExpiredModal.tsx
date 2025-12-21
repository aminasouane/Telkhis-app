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
import { AlertCircle, Clock, FileText, Calendar } from "lucide-react";
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

  const handleSubscribe = () => {
    navigate("/subscribe");
  };

  const getExpiryReason = () => {
    if (!trialStatus) return "انتهت التجربة المجانية";
    
    switch (trialStatus.reason) {
      case "summaries_exhausted":
        return `لقد استخدمت تلخيصك المجاني (${TRIAL_CONFIG.MAX_SUMMARIES} تلخيص)`;
      case "time_expired":
        return `لقد استخدمت كامل الوقت المجاني (${TRIAL_CONFIG.MAX_AUDIO_MINUTES} دقيقة)`;
      case "days_expired":
        return `انتهت صلاحية التجربة المجانية (${TRIAL_CONFIG.VALIDITY_DAYS} أيام)`;
      default:
        return "انتهت التجربة المجانية";
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">انتهت التجربة المجانية</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed" dir="rtl">
            {getExpiryReason()}
            <br />
            <br />
            اشترك الآن لمواصلة تلخيص المحاضرات بدون حدود.
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
                الأيام المتبقية: {trialStatus.daysRemaining}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            onClick={handleSubscribe}
            className="w-full"
            data-testid="button-subscribe-trial"
          >
            الاشتراك الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
