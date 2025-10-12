import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold">الصفحة غير موجودة</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          عذراً، الصفحة التي تبحث عنها غير متوفرة
        </p>
        <Link href="/">
          <Button data-testid="button-home">
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
