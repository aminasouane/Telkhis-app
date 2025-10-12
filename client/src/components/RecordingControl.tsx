import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type RecordingStatus = "idle" | "recording";

interface RecordingControlProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

export default function RecordingControl({ onRecordingComplete }: RecordingControlProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setStatus("recording");
      setDuration(0);

      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("تعذر الوصول للميكروفون. الرجاء التأكد من الأذونات.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset to idle after a short delay to allow processing
      setTimeout(() => {
        setStatus("idle");
        setDuration(0);
      }, 500);
    }
  };

  const handleRecord = () => {
    if (status === "idle") {
      startRecording();
    } else if (status === "recording") {
      stopRecording();
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
          variant={status === "recording" ? "destructive" : "outline"}
          data-testid="badge-status"
        >
          {status === "idle" && "جاهز للتسجيل"}
          {status === "recording" && "جاري التسجيل..."}
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
