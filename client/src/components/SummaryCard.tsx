import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, Info, FileText, FileDown, Printer, Share2 } from "lucide-react";
import { useState, useRef } from "react";
import { Language } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import ShareModal from "./ShareModal";

interface SummaryCardProps {
  summary: string;
  keyPoints?: string[];
  language?: Language;
  title?: string;
  date?: string;
}

export default function SummaryCard({ summary, keyPoints, language, title, date }: SummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareType, setShareType] = useState<"text" | "pdf">("text");
  const [pdfBlobForShare, setPdfBlobForShare] = useState<Blob | undefined>();
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getFilename = (extension: string) => {
    const timestamp = date ? format(new Date(date), "yyyy-MM-dd_HH-mm") : format(new Date(), "yyyy-MM-dd_HH-mm");
    const baseTitle = title || "ملخص-المحاضرة";
    return `${baseTitle}_${timestamp}.${extension}`;
  };

  const handleCopy = async () => {
    const textToCopy = keyPoints
      ? `${summary}\n\nالنقاط الرئيسية:\n${keyPoints.map((p) => `• ${p}`).join("\n")}`
      : summary;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "تم النسخ بنجاح",
        description: "تم نسخ التلخيص إلى الحافظة",
      });
    } catch (error) {
      toast({
        title: "خطأ في النسخ",
        description: "فشل نسخ التلخيص إلى الحافظة",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTXT = () => {
    const textToDownload = keyPoints
      ? `${summary}\n\nالنقاط الرئيسية:\n${keyPoints.map((p) => `• ${p}`).join("\n")}`
      : summary;
    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getFilename("txt");
    a.click();
    URL.revokeObjectURL(url);
    
    setIsExportDialogOpen(false);
    toast({
      title: "تم الحفظ بنجاح",
      description: "تم تحميل التلخيص كملف نصي",
    });
  };

  const handleDownloadPDF = async () => {
    if (!summaryContentRef.current) return;
    
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(summaryContentRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(getFilename("pdf"));

      setIsExportDialogOpen(false);
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تحميل التلخيص كملف PDF",
      });
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "فشل إنشاء ملف PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    setShareType("text");
    setIsShareDialogOpen(true);
  };

  const handleShareText = () => {
    setShareType("text");
    setIsShareDialogOpen(true);
  };

  const handleSharePDF = async () => {
    if (!summaryContentRef.current) return;
    
    setIsSharing(true);
    
    try {
      const canvas = await html2canvas(summaryContentRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      const pdfBlob = pdf.output('blob');
      setPdfBlobForShare(pdfBlob);
      setShareType("pdf");
      setIsShareDialogOpen(true);
      
      toast({
        title: "جاهز للمشاركة",
        description: "اختر المنصة لمشاركة ملف PDF",
      });
    } catch (error) {
      toast({
        title: "خطأ في إنشاء PDF",
        description: "فشل إنشاء ملف PDF",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Card className="bg-primary/5 printable-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4 flex-wrap">
        <CardTitle className="text-xl">الملخص</CardTitle>
        <div className="flex gap-2 flex-wrap">
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
            onClick={handlePrint}
            data-testid="button-print-summary"
            className="hover-elevate active-elevate-2 print:hidden"
          >
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            data-testid="button-share-summary"
            className="hover-elevate active-elevate-2 print:hidden"
          >
            <Share2 className="h-4 w-4 ml-2" />
            مشاركة
          </Button>
          
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                data-testid="button-export-summary"
                className="hover-elevate active-elevate-2 print:hidden"
              >
                <Download className="h-4 w-4 ml-2" />
                حفظ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>حفظ التلخيص</DialogTitle>
                <DialogDescription>
                  اختر صيغة الملف الذي تريد حفظه
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <Button
                  variant="outline"
                  onClick={handleDownloadTXT}
                  data-testid="button-export-txt"
                  className="justify-start gap-3 h-auto py-4 hover-elevate active-elevate-2"
                >
                  <FileText className="h-5 w-5" />
                  <div className="text-right flex-1">
                    <div className="font-medium">ملف نصي (TXT)</div>
                    <div className="text-sm text-muted-foreground">حفظ كملف نصي بسيط</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  data-testid="button-export-pdf"
                  className="justify-start gap-3 h-auto py-4 hover-elevate active-elevate-2"
                >
                  <FileDown className="h-5 w-5" />
                  <div className="text-right flex-1">
                    <div className="font-medium">مستند PDF</div>
                    <div className="text-sm text-muted-foreground">
                      {isExporting ? "جاري الإنشاء..." : "حفظ كملف PDF منسق"}
                    </div>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <ShareModal
            open={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
            title={title || "ملخص المحاضرة"}
            text={keyPoints
              ? `${summary}\n\nالنقاط الرئيسية:\n${keyPoints.map((p) => `• ${p}`).join("\n")}`
              : summary}
            shareType={shareType}
            pdfBlob={pdfBlobForShare}
            pdfFilename={getFilename("pdf")}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4" ref={summaryContentRef}>
        {language === "dz" && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md border" data-testid="badge-language-conversion">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              سيتم تلخيص المحاضرة باللغة العربية
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
