import { Link } from "wouter";
import { Users, FileText, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-muted/50 border-t mt-auto" dir="rtl">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/about">
              <a 
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-about"
              >
                <Users className="h-4 w-4" />
                <span>من نحن</span>
              </a>
            </Link>
            
            <Link href="/terms">
              <a 
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-terms"
              >
                <FileText className="h-4 w-4" />
                <span>الشروط والأحكام</span>
              </a>
            </Link>
            
            <Link href="/privacy">
              <a 
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-privacy"
              >
                <Shield className="h-4 w-4" />
                <span>سياسة الخصوصية</span>
              </a>
            </Link>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            <p>تلخيصلي - تلخيص ذكي للمحاضرات والتسجيلات الصوتية</p>
            <p className="mt-1">{new Date().getFullYear()} جميع الحقوق محفوظة</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
