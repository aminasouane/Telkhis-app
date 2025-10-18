import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  FaWhatsapp, 
  FaTelegram, 
  FaFacebook, 
  FaLinkedin,
  FaEnvelope
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Copy, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  shareType: "text" | "pdf";
  pdfBlob?: Blob;
  pdfFilename?: string;
}

interface SharePlatform {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  action: () => void;
}

export default function ShareModal({ 
  open, 
  onOpenChange, 
  title, 
  text, 
  shareType,
  pdfBlob,
  pdfFilename
}: ShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(shareUrl);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "تم النسخ بنجاح",
        description: "تم نسخ التلخيص إلى الحافظة",
      });
    } catch (error) {
      toast({
        title: "خطأ في النسخ",
        description: "فشل نسخ النص",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "تم نسخ الرابط",
        description: "تم نسخ رابط الصفحة إلى الحافظة",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل نسخ الرابط",
        variant: "destructive",
      });
    }
  };

  const handleWhatsApp = () => {
    const message = shareType === "pdf" 
      ? `${title}\n\n${text}`
      : text;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    onOpenChange(false);
  };

  const handleTelegram = () => {
    const message = shareType === "pdf"
      ? `${title}\n\n${text}`
      : text;
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(message)}`, '_blank');
    onOpenChange(false);
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank');
    onOpenChange(false);
  };

  const handleTwitter = () => {
    const tweetText = text.length > 280 ? text.substring(0, 277) + '...' : text;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodedUrl}`, '_blank');
    onOpenChange(false);
  };

  const handleLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank');
    onOpenChange(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${text}\n\n---\nمشاركة من تطبيق تلخيصلي`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    onOpenChange(false);
  };

  const platforms: SharePlatform[] = [
    {
      name: "واتساب",
      icon: <FaWhatsapp className="h-6 w-6" />,
      color: "text-[#25D366]",
      bgColor: "hover:bg-[#25D366]/10",
      action: handleWhatsApp,
    },
    {
      name: "تيليغرام",
      icon: <FaTelegram className="h-6 w-6" />,
      color: "text-[#0088cc]",
      bgColor: "hover:bg-[#0088cc]/10",
      action: handleTelegram,
    },
    {
      name: "فيسبوك",
      icon: <FaFacebook className="h-6 w-6" />,
      color: "text-[#1877F2]",
      bgColor: "hover:bg-[#1877F2]/10",
      action: handleFacebook,
    },
    {
      name: "X (تويتر)",
      icon: <FaXTwitter className="h-6 w-6" />,
      color: "text-foreground",
      bgColor: "hover:bg-muted",
      action: handleTwitter,
    },
    {
      name: "لينكدإن",
      icon: <FaLinkedin className="h-6 w-6" />,
      color: "text-[#0A66C2]",
      bgColor: "hover:bg-[#0A66C2]/10",
      action: handleLinkedIn,
    },
    {
      name: "البريد الإلكتروني",
      icon: <FaEnvelope className="h-6 w-6" />,
      color: "text-muted-foreground",
      bgColor: "hover:bg-muted",
      action: handleEmail,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {shareType === "pdf" ? "مشاركة ملف PDF" : "مشاركة التلخيص"}
          </DialogTitle>
          <DialogDescription>
            اختر المنصة التي تريد المشاركة عليها
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Social Media Platforms Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {platforms.map((platform) => (
              <Button
                key={platform.name}
                variant="outline"
                onClick={platform.action}
                data-testid={`button-share-${platform.name.toLowerCase()}`}
                className={`h-auto py-4 flex flex-col gap-2 items-center justify-center ${platform.bgColor} hover-elevate active-elevate-2 transition-colors`}
              >
                <span className={platform.color}>{platform.icon}</span>
                <span className="text-sm font-medium">{platform.name}</span>
              </Button>
            ))}
          </div>

          {/* Additional Options */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCopyText}
              data-testid="button-copy-text"
              className="w-full justify-start gap-3 h-auto py-3 hover-elevate active-elevate-2"
            >
              <Copy className="h-5 w-5" />
              <div className="text-right flex-1">
                <div className="font-medium">
                  {copied ? "تم النسخ ✓" : "نسخ النص"}
                </div>
                <div className="text-xs text-muted-foreground">
                  انسخ التلخيص إلى الحافظة
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={handleCopyLink}
              data-testid="button-copy-link"
              className="w-full justify-start gap-3 h-auto py-3 hover-elevate active-elevate-2"
            >
              <LinkIcon className="h-5 w-5" />
              <div className="text-right flex-1">
                <div className="font-medium">نسخ الرابط</div>
                <div className="text-xs text-muted-foreground">
                  انسخ رابط هذه الصفحة
                </div>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
