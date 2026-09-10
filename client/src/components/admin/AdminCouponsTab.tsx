import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Ticket,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Percent,
  TrendingDown,
  Sparkles,
  Loader2,
  Calendar,
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  validForRegistration: boolean;
  validForRenewal: boolean;
  isActive: boolean;
  maxUses: number | null;
  timesUsed: number;
  expiresAt: string | null;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface CouponUsage {
  id: string;
  couponCode: string;
  userId: string;
  userEmail?: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  usageType: "registration" | "renewal";
  usedAt: string;
}

export default function AdminCouponsTab() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usages, setUsages] = useState<CouponUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  // Form state for creating a new coupon
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [validForRegistration, setValidForRegistration] = useState(true);
  const [validForRenewal, setValidForRenewal] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [description, setDescription] = useState("");

  const fetchAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const headers = await fetchAuthHeaders();
      const [couponsRes, usagesRes] = await Promise.all([
        fetch("/api/admin/coupons", { headers }),
        fetch("/api/admin/coupons/usages", { headers }),
      ]);

      if (couponsRes.ok) {
        const data = await couponsRes.json();
        setCoupons(data.coupons || []);
      }
      if (usagesRes.ok) {
        const data = await usagesRes.json();
        setUsages(data.usages || []);
      }
    } catch (err: any) {
      console.error("Error loading coupons:", err);
      toast({
        title: "خطأ",
        description: "فشل تحميل قائمة الكوبونات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setCode("");
    setDiscountPercent(20);
    setValidForRegistration(true);
    setValidForRenewal(true);
    setIsActive(true);
    setMaxUses("");
    setExpiresAt("");
    setDescription("");
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      toast({ title: "تنبيه", description: "يرجى كتابة رمز الكوبون", variant: "destructive" });
      return;
    }

    if (discountPercent <= 0 || discountPercent > 100) {
      toast({ title: "تنبيه", description: "نسبة الخصم يجب أن تكون بين 1 و 100%", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = await fetchAuthHeaders();
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: cleanCode,
          discountPercent: Number(discountPercent),
          validForRegistration,
          validForRenewal,
          isActive,
          maxUses: maxUses ? parseInt(maxUses) : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          description,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "فشل إنشاء الكوبون");
      }

      toast({
        title: "تم بنجاح",
        description: `تم إنشاء الكوبون ${cleanCode} بنسبة خصم ${discountPercent}%`,
      });

      setIsCreateOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء إنشاء الكوبون",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (couponId: string, field: "validForRegistration" | "validForRenewal" | "isActive", currentValue: boolean) => {
    const newValue = !currentValue;
    // Optimistically update UI
    setCoupons(prev =>
      prev.map(c => (c.id === couponId ? { ...c, [field]: newValue } : c))
    );

    try {
      const headers = await fetchAuthHeaders();
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ [field]: newValue }),
      });

      if (!res.ok) {
        throw new Error("فشل تحديث الكوبون");
      }

      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات الكوبون بنجاح",
      });
    } catch (err: any) {
      // Revert optimistic update on failure
      setCoupons(prev =>
        prev.map(c => (c.id === couponId ? { ...c, [field]: currentValue } : c))
      );
      toast({
        title: "خطأ",
        description: err.message || "فشل التحديث",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;
    setIsSubmitting(true);
    try {
      const headers = await fetchAuthHeaders();
      const res = await fetch(`/api/admin/coupons/${couponToDelete.id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        throw new Error("فشل حذف الكوبون");
      }

      toast({
        title: "تم الحذف",
        description: `تم حذف الكوبون ${couponToDelete.code}`,
      });

      setCouponToDelete(null);
      loadData();
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء حذف الكوبون",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick stats calculations
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.isActive).length;
  const totalTimesUsed = coupons.reduce((sum, c) => sum + (c.timesUsed || 0), 0);
  const totalDiscountGiven = usages.reduce((sum, u) => sum + (u.discountAmount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            إدارة كوبونات الخصم
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            أنشئ كوبونات خصم، حدد نسبتها، وتحكّم في صلاحيتها عند التسجيل الجديد أو عند التجديد
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            إضافة كوبون جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCoupons}</p>
              <p className="text-xs text-muted-foreground">إجمالي الكوبونات</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCoupons}</p>
              <p className="text-xs text-muted-foreground">الكوبونات النشطة</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTimesUsed}</p>
              <p className="text-xs text-muted-foreground">مرات الاستخدام</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDiscountGiven.toLocaleString()} دج</p>
              <p className="text-xs text-muted-foreground">مجموع الخصومات الممنوحة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">قائمة الكوبونات ({coupons.length})</CardTitle>
          <CardDescription>
            يمكنك تفعيل أو إبطال الكوبون في التسجيل أو في التجديد مباشرة عبر المفاتيح أدناه
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {coupons.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
              <p className="font-medium text-foreground">لا يوجد أي كوبون حتى الآن</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                اضغط على زر "إضافة كوبون جديد" لبدء منح عملائك خصومات أثناء التسجيل أو التجديد
              </p>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="mt-2">
                <Plus className="h-4 w-4 ml-1" />
                إنشاء أول كوبون
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                  <tr>
                    <th className="p-3">رمز الكوبون</th>
                    <th className="p-3">نسبة الخصم</th>
                    <th className="p-3 text-center">صالح للتسجيل</th>
                    <th className="p-3 text-center">صالح للتجديد</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3">الاستخدام</th>
                    <th className="p-3">تاريخ الانتهاء</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {coupons.map(coupon => {
                    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now();
                    const isExhausted = coupon.maxUses !== null && coupon.timesUsed >= coupon.maxUses;

                    return (
                      <tr key={coupon.id} className="hover:bg-muted/20 transition-colors">
                        {/* Code */}
                        <td className="p-3 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-sm tracking-wide bg-primary/5 text-primary border-primary/20">
                              {coupon.code}
                            </Badge>
                            {coupon.description && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                ({coupon.description})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="p-3">
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                            {coupon.discountPercent}% خصم
                          </Badge>
                        </td>

                        {/* Valid for Registration Toggle */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Switch
                              checked={coupon.validForRegistration}
                              onCheckedChange={() => handleToggle(coupon.id, "validForRegistration", coupon.validForRegistration)}
                            />
                            <span className={`text-[11px] ${coupon.validForRegistration ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                              {coupon.validForRegistration ? "مفعّل" : "معطّل"}
                            </span>
                          </div>
                        </td>

                        {/* Valid for Renewal Toggle */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Switch
                              checked={coupon.validForRenewal}
                              onCheckedChange={() => handleToggle(coupon.id, "validForRenewal", coupon.validForRenewal)}
                            />
                            <span className={`text-[11px] ${coupon.validForRenewal ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                              {coupon.validForRenewal ? "مفعّل" : "معطّل"}
                            </span>
                          </div>
                        </td>

                        {/* Active Toggle */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Switch
                              checked={coupon.isActive}
                              onCheckedChange={() => handleToggle(coupon.id, "isActive", coupon.isActive)}
                            />
                            <span className={`text-[11px] ${coupon.isActive ? "text-primary font-medium" : "text-destructive font-medium"}`}>
                              {coupon.isActive ? "نشط" : "موقوف"}
                            </span>
                          </div>
                        </td>

                        {/* Usage counter */}
                        <td className="p-3 text-muted-foreground">
                          <span className="font-semibold text-foreground">{coupon.timesUsed || 0}</span>
                          {coupon.maxUses !== null ? (
                            <span> / {coupon.maxUses}</span>
                          ) : (
                            <span className="text-xs"> (غير محدود)</span>
                          )}
                          {isExhausted && (
                            <Badge variant="destructive" className="mr-2 text-[10px]">استُنفد</Badge>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="p-3 text-xs text-muted-foreground">
                          {coupon.expiresAt ? (
                            <div className="space-y-0.5">
                              <p>{new Date(coupon.expiresAt).toLocaleDateString("ar-DZ")}</p>
                              {isExpired && (
                                <Badge variant="destructive" className="text-[10px]">منتهي</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/70">دائم</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setCouponToDelete(coupon)}
                            title="حذف الكوبون"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Usages Section */}
      {usages.length > 0 && (
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">سجل استخدامات الكوبونات الأخيرة ({usages.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b">
                  <tr>
                    <th className="p-2.5">الكوبون</th>
                    <th className="p-2.5">النوع</th>
                    <th className="p-2.5">قيمة الخصم</th>
                    <th className="p-2.5">المبلغ النهائي</th>
                    <th className="p-2.5">المستخدم</th>
                    <th className="p-2.5">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usages.slice(0, 10).map(u => (
                    <tr key={u.id} className="hover:bg-muted/10">
                      <td className="p-2.5 font-mono font-bold text-primary">{u.couponCode}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {u.usageType === "renewal" ? "تجديد" : "تسجيل جديد"}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-emerald-600 font-medium">-{u.discountAmount} دج</td>
                      <td className="p-2.5 font-bold">{u.finalPrice} دج</td>
                      <td className="p-2.5 text-muted-foreground truncate max-w-xs">{u.userEmail || u.userId}</td>
                      <td className="p-2.5 text-muted-foreground">
                        {new Date(u.usedAt).toLocaleDateString("ar-DZ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Coupon Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              إضافة كوبون خصم جديد
            </DialogTitle>
            <DialogDescription>
              حدد رمز الكوبون ونسبة الخصم، واختر ما إذا كان صالحاً عند التسجيل الجديد أو عند التجديد
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>رمز الكوبون (Coupon Code) *</Label>
              <Input
                placeholder="مثال: RAMADAN25 أو WELCOME50"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase text-left tracking-wider"
                required
              />
              <p className="text-[11px] text-muted-foreground">سيتم تحويل الأحرف تلقائياً إلى أحرف كبيرة.</p>
            </div>

            <div className="space-y-2">
              <Label>نسبة الخصم (%) *</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Number(e.target.value))}
                  required
                />
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                على الخطة الأساسية (1,500 دج): الخصم = {Math.round((1500 * discountPercent) / 100)} دج · السعر النهائي = {Math.max(0, 1500 - Math.round((1500 * discountPercent) / 100))} دج
              </p>
            </div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <Label className="text-xs font-bold text-foreground">خيارات الصلاحية والتحكم:</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">صالح عند التسجيل الجديد (أول اشتراك)</p>
                  <p className="text-xs text-muted-foreground">يسمح للعملاء الجدد باستخدامه عند الاشتراك لأول مرة</p>
                </div>
                <Switch checked={validForRegistration} onCheckedChange={setValidForRegistration} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">صالح عند تجديد الاشتراك</p>
                  <p className="text-xs text-muted-foreground">يسمح للمشتركين السابقين باستخدامه لتجديد خطتهم</p>
                </div>
                <Switch checked={validForRenewal} onCheckedChange={setValidForRenewal} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">تفعيل الكوبون فوراً</p>
                  <p className="text-xs text-muted-foreground">يمكنك إيقافه مؤقتاً في أي وقت</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>أقصى عدد استخدام (اختياري)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="غير محدود"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>تاريخ الانتهاء (اختياري)</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>وصف أو ملاحظة (اختياري)</Label>
              <Input
                placeholder="مثال: حملة طلاب الجامعات"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 pt-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                إنشاء الكوبون
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!couponToDelete} onOpenChange={open => !open && setCouponToDelete(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف الكوبون
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف الكوبون <strong className="font-mono text-foreground">{couponToDelete?.code}</strong>؟
              لن يتمكن أي مستخدم من استخدامه بعد الحذف.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setCouponToDelete(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              نعم، احذف الكوبون
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
