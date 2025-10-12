import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, Info } from "lucide-react";
import { useState } from "react";
import { Language } from "@shared/schema";

interface SummaryCardProps {
  summary: string;
  keyPoints?: string[];
  language?: Language;
}

export default function SummaryCard({ summary, keyPoints, language }: SummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = keyPoints
      ? `${summary}\n\nالنقاط الرئيسية:\n${keyPoints.map((p) => `• ${p}`).join("\n")}`
      : summary;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const textToDownload = keyPoints
      ? `${summary}\n\nالنقاط الرئيسية:\n${keyPoints.map((p) => `• ${p}`).join("\n")}`
      : summary;
    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ملخص-المحاضرة.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4 flex-wrap">
        <CardTitle className="text-xl">الملخص</CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            data-testid="button-copy-summary"
            className="hover-elevate active-elevate-2"
          >
            {copied ? (
              <Check className="h-4 w-4 ml-2" />
            ) : (
              <Copy className="h-4 w-4 ml-2" />
            )}
            {copied ? "تم" : "نسخ"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            data-testid="button-download-summary"
            className="hover-elevate active-elevate-2"
          >
            <Download className="h-4 w-4 ml-2" />
            تحميل
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {language === "dz" && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md border" data-testid="badge-language-conversion">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              تم تحويل التلخيص إلى عربية فصحى مبسطة من لهجة جزائرية
            </p>
          </div>
        )}
        
        <p className="text-base leading-relaxed" data-testid="text-summary">
          {summary}
        </p>

        {keyPoints && keyPoints.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">النقاط الرئيسية:</h4>
            <ul className="space-y-2">
              {keyPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex gap-2 items-start"
                  data-testid={`text-keypoint-${index}`}
                >
                  <span className="text-primary mt-1">•</span>
                  <span className="flex-1">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
