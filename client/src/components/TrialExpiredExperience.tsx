import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileText, Calendar, Sparkles } from "lucide-react";
import { type TrialStatus } from "@/services/localTrialService";
import { TRIAL_CONFIG } from "@/config/trialConfig";

interface TrialExpiredExperienceProps {
  trialStatus: TrialStatus | null;
  showMetrics?: boolean;
}

export default function TrialExpiredExperience({
  trialStatus,
  showMetrics = true,
}: TrialExpiredExperienceProps) {
  const [, navigate] = useLocation();

  const getExpiryReason = () => {
    if (!trialStatus) return null;
    
    switch (trialStatus.reason) {
      case "summaries_exhausted":
        return `لقد استخدمت تلخيصك المجاني`;
      case "time_expired":
        return `لقد استخدمت كامل الوقت المجاني (${TRIAL_CONFIG.MAX_AUDIO_MINUTES} دقيقة)`;
      case "days_expired":
        return `انتهت صلاحية التجربة (${TRIAL_CONFIG.VALIDITY_DAYS} أيام)`;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">
            انتهت تجربتك المجانية
          </h1>
          
          <p className="text-muted-foreground leading-relaxed">
            نأمل أن تكون قد استفدت من تلخيصلي. يمكنك الترقية قريبًا لمتابعة استخدام جميع الميزات.
          </p>

          {getExpiryReason() && (
            <p className="text-sm text-muted-foreground">
              {getExpiryReason()}
            </p>
          )}
        </div>

        {showMetrics && trialStatus && (
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-foreground mb-3">ملخص استخدامك:</p>
              
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  التلخيصات: {trialStatus.summariesUsed} من {trialStatus.summariesLimit}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  الوقت: {trialStatus.minutesUsed.toFixed(1)} من {trialStatus.minutesLimit} دقيقة
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  الأيام المتبقية: {Math.max(0, trialStatus.daysRemaining)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pt-4">
          <Button
            className="w-full"
            size="lg"
            variant="outline"
            onClick={() => navigate("/history")}
            data-testid="button-continue-browsing"
          >
            <Sparkles className="h-4 w-4 ml-2" />
            سيتم فتح الاشتراك قريبًا — متابعة التصفح
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          سنُعلمك فور توفر خطط الاشتراك. شكرًا لاستخدامك تلخيصلي!
        </p>
      </div>
    </div>
  );
}
