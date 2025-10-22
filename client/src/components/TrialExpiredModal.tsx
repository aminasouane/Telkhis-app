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
import { AlertCircle, Clock } from "lucide-react";

interface TrialExpiredModalProps {
  open: boolean;
  minutesUsed: number;
  minutesLimit: number;
}

export default function TrialExpiredModal({
  open,
  minutesUsed,
  minutesLimit
}: TrialExpiredModalProps) {
  const [, navigate] = useLocation();

  const handleSubscribe = () => {
    navigate("/subscribe");
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
            لقد استخدمت كامل التجربة المجانية ({minutesLimit} دقيقة صوت).
            <br />
            <br />
            اشترك الآن لمواصلة تلخيص المحاضرات بدون حدود.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 p-4 rounded-lg mt-4" dir="rtl">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              استخدامك: {(minutesUsed || 0).toFixed(1)} من {minutesLimit || 30} دقيقة
            </p>
          </div>
        </div>

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
