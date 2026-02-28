import { useUserStatus } from "@/hooks/useUserStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Clock, Calendar, Crown, RefreshCw, Zap, AlertTriangle, ShieldCheck, Infinity
} from "lucide-react";
import { useLocation } from "wouter";

function getPlanLabel(planName: string): { label: string; color: string; icon: typeof Crown } {
    switch (planName) {
        case "admin":
            return { label: "حساب إداري", color: "bg-primary/10 text-primary", icon: ShieldCheck };
        case "basic":
            return { label: "الخطة الأساسية", color: "bg-blue-100 text-blue-700", icon: Zap };
        case "student":
            return { label: "خطة الطالب", color: "bg-purple-100 text-purple-700", icon: Crown };
        case "professional":
            return { label: "خطة المحترف", color: "bg-amber-100 text-amber-700", icon: Crown };
        default:
            return { label: "تجربة مجانية", color: "bg-muted text-muted-foreground", icon: Clock };
    }
}

function getProgressColor(pct: number): string {
    if (pct > 60) return "bg-emerald-500";
    if (pct > 25) return "bg-amber-400";
    return "bg-red-500";
}

function getTimeUntilMidnight(): { hours: number; minutes: number } {
    const now = new Date();
    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    };
}

export default function SubscriptionCard() {
    const { status, isLoading, refetch } = useUserStatus();
    const [, navigate] = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    /* ── ADMIN: بطاقة خاصة بدون أي حدود ── */
    if (status.planName === "admin") {
        return (
            <div className="space-y-4" dir="rtl">
                <Card className="shadow-sm border-0 bg-primary/5">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-7 w-7 text-primary" />
                            </div>
                            <div className="text-right flex-1">
                                <div className="flex items-center justify-end gap-2 mb-1">
                                    <Badge className="bg-primary/10 text-primary text-xs px-2 py-0.5">إداري</Badge>
                                </div>
                                <h2 className="text-lg font-bold text-foreground">صلاحيات كاملة غير محدودة</h2>
                                <p className="text-sm text-muted-foreground">وصول غير مقيد لجميع ميزات المنصة</p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                            {[
                                { icon: Infinity, label: "دقائق غير محدودة" },
                                { icon: Infinity, label: "بلا حد يومي" },
                                { icon: Infinity, label: "بلا تاريخ انتهاء" },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="bg-card rounded-lg py-2 px-1">
                                    <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
                                    <p className="text-[10px] text-muted-foreground">{label}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1 text-muted-foreground hover:text-primary"
                    onClick={() => refetch()}
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    تحديث البيانات
                </Button>
            </div>
        );
    }

    /* ── باقي المستخدمين ── */
    const plan = getPlanLabel(status.planName);
    const PlanIcon = plan.icon;
    const minutesPct = status.minutesLimit > 0
        ? Math.round(((status.minutesLimit - status.minutesUsed) / status.minutesLimit) * 100)
        : 0;
    const dailyPct = status.dailyMinutesLimit
        ? Math.round(((status.dailyMinutesLimit - status.dailyMinutesUsed) / status.dailyMinutesLimit) * 100)
        : 100;
    const isTrial = !status.isPaid;
    const { hours: resetHours, minutes: resetMinutes } = getTimeUntilMidnight();
    const lowMinutes = minutesPct < 20 && minutesPct > 0;

    return (
        <div className="space-y-4" dir="rtl">
            {/* Low minutes warning */}
            {lowMinutes && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>الدقائق المتبقية أقل من 20%! ترقّ لخطة أعلى لمتابعة الاستخدام.</span>
                </div>
            )}

            {/* Plan info */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                        <Badge className={`text-xs px-3 py-1 rounded-full font-medium ${plan.color}`}>
                            {plan.label}
                        </Badge>
                        <span className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                            خطتك الحالية
                            <PlanIcon className="h-5 w-5 text-primary" />
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Main minutes */}
                    <div className="text-center py-2">
                        <p className="text-5xl font-bold text-foreground">{Math.floor(status.minutesRemaining)}</p>
                        <p className="text-sm text-muted-foreground mt-1">دقيقة متبقية من {status.minutesLimit}</p>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground flex-row-reverse">
                            <span>مستهلك ({status.minutesUsed.toFixed(1)} د)</span>
                            <span>المتاح ({Math.floor(status.minutesRemaining)} د)</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${getProgressColor(minutesPct)}`}
                                style={{ width: `${minutesPct}%` }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Daily limit — trial only */}
            {isTrial && (
                <Card className="shadow-sm border-0">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-end gap-2 text-base font-semibold text-card-foreground">
                            الحد اليومي
                            <Calendar className="h-5 w-5 text-amber-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center py-1">
                            <p className="text-4xl font-bold text-foreground">
                                {Math.floor(status.dailyMinutesRemaining ?? 0)}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">دقيقة متبقية اليوم من {status.dailyMinutesLimit}</p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="h-3 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${getProgressColor(dailyPct)}`}
                                    style={{ width: `${dailyPct}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-lg py-2">
                            <RefreshCw className="h-3 w-3" />
                            يتجدد بعد {resetHours} ساعة و{resetMinutes} دقيقة
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Trial validity */}
            {isTrial && status.daysRemaining !== null && (
                <Card className="shadow-sm border-0">
                    <CardContent className="flex items-center gap-3 py-4">
                        <div className="text-right flex-1">
                            <p className="font-medium text-foreground">صلاحية التجربة</p>
                            <p className="text-sm text-muted-foreground">
                                {status.daysRemaining > 0
                                    ? `${status.daysRemaining} يوم متبق`
                                    : "انتهت فترة التجربة"}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Upgrade CTA */}
            {isTrial && (
                <Button
                    variant="outline"
                    className="w-full gap-2 py-5 text-base border-amber-400 text-amber-600 hover:bg-amber-50"
                    onClick={() => navigate("/subscribe")}
                >
                    <Crown className="h-5 w-5" />
                    ترقية الخطة
                </Button>
            )}

            {/* Refresh button */}
            <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1 text-muted-foreground hover:text-primary"
                onClick={() => refetch()}
            >
                <RefreshCw className="h-3.5 w-3.5" />
                تحديث البيانات
            </Button>
        </div>
    );
}
