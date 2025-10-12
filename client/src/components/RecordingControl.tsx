import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type RecordingStatus = "idle" | "recording" | "processing";

export default function RecordingControl() {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [duration, setDuration] = useState(0);

  const handleRecord = () => {
    if (status === "idle") {
      setStatus("recording");
      // TODO: remove mock functionality
      const interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      setTimeout(() => {
        clearInterval(interval);
        setStatus("idle");
        setDuration(0);
      }, 3000);
    } else if (status === "recording") {
      setStatus("processing");
      setTimeout(() => {
        setStatus("idle");
        setDuration(0);
      }, 2000);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <Button
          size="icon"
          variant={status === "recording" ? "destructive" : "default"}
          onClick={handleRecord}
          disabled={status === "processing"}
          data-testid="button-record"
          className={cn(
            "h-20 w-20 sm:h-24 sm:w-24 rounded-full transition-all",
            status === "recording" && "animate-pulse"
          )}
        >
          {status === "recording" ? (
            <Square className="h-8 w-8 sm:h-10 sm:w-10" />
          ) : (
            <Mic className="h-8 w-8 sm:h-10 sm:w-10" />
          )}
        </Button>

        {status === "recording" && (
          <div className="absolute -inset-2 rounded-full border-2 border-destructive animate-ping opacity-75" />
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Badge
          variant={
            status === "recording"
              ? "destructive"
              : status === "processing"
              ? "secondary"
              : "outline"
          }
          data-testid="badge-status"
        >
          {status === "idle" && "جاهز للتسجيل"}
          {status === "recording" && "جاري التسجيل..."}
          {status === "processing" && "جاري المعالجة..."}
        </Badge>

        {status === "recording" && (
          <p className="text-2xl font-mono font-semibold" data-testid="text-duration">
            {formatDuration(duration)}
          </p>
        )}
      </div>

      {status === "recording" && (
        <div className="flex gap-1 items-end h-12">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 100}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
