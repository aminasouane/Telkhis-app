import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface TranscriptionCardProps {
  text: string;
  timestamps?: { time: string; text: string }[];
}

export default function TranscriptionCard({
  text,
  timestamps,
}: TranscriptionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <CardTitle className="text-xl">النص المكتوب</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          data-testid="button-copy-transcription"
          className="hover-elevate active-elevate-2"
        >
          {copied ? (
            <Check className="h-4 w-4 ml-2" />
          ) : (
            <Copy className="h-4 w-4 ml-2" />
          )}
          {copied ? "تم النسخ" : "نسخ"}
        </Button>
      </CardHeader>
      <CardContent>
        {timestamps && timestamps.length > 0 ? (
          <div className="space-y-3">
            {timestamps.map((item, index) => (
              <div key={index} className="flex gap-3">
                <span className="text-xs text-muted-foreground font-mono whitespace-nowrap pt-1">
                  {item.time}
                </span>
                <p className="text-base leading-relaxed" data-testid={`text-transcript-${index}`}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base leading-relaxed whitespace-pre-wrap" data-testid="text-transcript">
            {text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
