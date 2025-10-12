import { Mic } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-6">
        <Mic className="h-12 w-12 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">ابدأ التسجيل الآن</h2>
      <p className="text-muted-foreground max-w-md">
        سجل محاضرتك أو ارفع ملف صوتي للحصول على نص مكتوب وملخص شامل
        بواسطة الذكاء الاصطناعي
      </p>
    </div>
  );
}
