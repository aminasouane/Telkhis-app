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
import { AlertCircle } from "lucide-react";

interface TrialExpiredModalProps {
  open: boolean;
  summariesUsed: number;
  summariesLimit: number;
  daysRemaining: number;
}

export default function TrialExpiredModal({
  open,
  summariesUsed,
  summariesLimit,
  daysRemaining
}: TrialExpiredModalProps) {
  const [, navigate] = useLocation();

  const handleSignIn = () => {
    navigate("/login?returnTo=/");
  };

  const handleSubscribe = () => {
    navigate("/subscribe");
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">انتهت الفترة التجريبية</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed" dir="rtl">
            {summariesUsed >= summariesLimit ? (
              <>
                لقد استخدمت جميع التلخيصات المتاحة في الفترة التجريبية ({summariesLimit} تلخيصات).
                <br />
                <br />
                سجل الدخول أو اشترك للاستمرار في استخدام تلخيصلي.
              </>
            ) : (
              <>
                انتهت مدة التجربة المجانية ({daysRemaining === 0 ? 'اليوم' : `منذ ${Math.abs(daysRemaining)} يوم`}).
                <br />
                <br />
                سجل الدخول أو اشترك للاستمرار في استخدام تلخيصلي.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 p-4 rounded-lg mt-4" dir="rtl">
          <p className="text-sm text-muted-foreground">
            📊 استخدامك: {summariesUsed} من {summariesLimit} تلخيصات
          </p>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2 mt-4">
          <Button
            onClick={handleSignIn}
            variant="outline"
            className="flex-1"
            data-testid="button-signin-trial"
          >
            تسجيل الدخول
          </Button>
          <Button
            onClick={handleSubscribe}
            className="flex-1"
            data-testid="button-subscribe-trial"
          >
            الاشتراك
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
