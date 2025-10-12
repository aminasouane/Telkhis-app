import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type RecordingStatus = "idle" | "recording" | "stopping";

interface LiveUpdateData {
  transcription: string;
  summary: string;
  keyPoints: string[];
}

interface RecordingControlProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onLiveUpdate?: (data: LiveUpdateData) => void;
  onRecordingStart?: () => void;
  language: string;
}

export default function RecordingControl({ 
  onRecordingComplete, 
  onLiveUpdate,
  onRecordingStart,
  language 
}: RecordingControlProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isProcessingLive, setIsProcessingLive] = useState(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (liveUpdateIntervalRef.current) {
        clearInterval(liveUpdateIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const processLiveChunk = async () => {
    if (!onLiveUpdate || chunksRef.current.length === 0 || isProcessingLive) {
      return;
    }

    try {
      setIsProcessingLive(true);
      
      // Create blob from accumulated chunks
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      
      // Only process if we have meaningful audio (> 1KB)
      if (audioBlob.size < 1024) {
        return;
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, "live-recording.webm");
      formData.append("language", language);

      const response = await fetch("/api/process-audio-live", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.transcription || data.summary) {
          onLiveUpdate({
            transcription: data.transcription || "",
            summary: data.summary || "",
            keyPoints: data.keyPoints || [],
          });
        }
      }
    } catch (error) {
      console.error("Live update error:", error);
      // Silently fail - don't interrupt recording
    } finally {
      setIsProcessingLive(false);
    }
  };

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
        
        // Reset to idle after recording is complete
        setStatus("idle");
        setDuration(0);
      };

      // Start with 5-second timeslice to enable live updates
      mediaRecorder.start(5000);
      setStatus("recording");
      setDuration(0);

      // Notify parent that recording has started
      if (onRecordingStart) {
        onRecordingStart();
      }

      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Start live updates every 15 seconds
      if (onLiveUpdate) {
        liveUpdateIntervalRef.current = setInterval(() => {
          processLiveChunk();
        }, 15000); // 15 seconds
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("تعذر الوصول للميكروفون. الرجاء التأكد من الأذونات.");
    }
  };

  const stopRecording = () => {
    if (status === "stopping") return; // Prevent multiple clicks
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setStatus("stopping");
      mediaRecorderRef.current.stop();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (liveUpdateIntervalRef.current) {
        clearInterval(liveUpdateIntervalRef.current);
        liveUpdateIntervalRef.current = null;
      }
      // Status will be reset to idle in onstop callback
    }
  };

  const handleRecord = () => {
    if (status === "idle") {
      startRecording();
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
          data-testid="button-start-recording"
          disabled={status === "recording" || status === "stopping"}
          className={cn(
            "h-20 w-20 sm:h-24 sm:w-24 rounded-full transition-all",
            status === "recording" && "animate-pulse"
          )}
        >
          <Mic className="h-8 w-8 sm:h-10 sm:w-10" />
        </Button>

        {status === "recording" && (
          <div className="absolute -inset-2 rounded-full border-2 border-destructive animate-ping opacity-75" />
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Badge
          variant={status === "recording" ? "destructive" : status === "stopping" ? "secondary" : "outline"}
          data-testid="badge-status"
        >
          {status === "idle" && "جاهز للتسجيل"}
          {status === "recording" && "جاري التسجيل..."}
          {status === "stopping" && "جاري الإيقاف..."}
        </Badge>

        {(status === "recording" || status === "stopping") && (
          <p className="text-2xl font-mono font-semibold" data-testid="text-duration">
            {formatDuration(duration)}
          </p>
        )}
      </div>

      {(status === "recording" || status === "stopping") && (
        <>
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

          <Button
            size="lg"
            variant="destructive"
            onClick={stopRecording}
            disabled={status === "stopping"}
            data-testid="button-stop-recording"
            className="min-w-[200px] gap-2"
          >
            <StopCircle className="h-5 w-5" />
            {status === "stopping" ? "جاري الإيقاف..." : "إيقاف التسجيل"}
          </Button>
        </>
      )}
    </div>
  );
}
