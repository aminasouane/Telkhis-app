import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users, FileText, CreditCard, TrendingUp,
    RefreshCw, UserCheck, UserX, Calendar,
    BarChart3, Activity, DollarSign, Clock
} from "lucide-react";

interface AdminStats {
    totalUsers: number;
    paidUsers: number;
    trialUsers: number;
    totalSummaries: number;
    summariesToday: number;
    totalPayments: number;
    revenueTotal: number;
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color = "text-primary",
    bg = "bg-primary/10",
}: {
    icon: typeof Users;
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
    bg?: string;
}) {
    return (
        <Card className="shadow-sm border-0">
            <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdminStatsTab() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error("Failed to fetch admin stats", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>تعذّر تحميل الإحصائيات</p>
                <Button variant="ghost" size="sm" className="mt-3 gap-2" onClick={fetchStats}>
                    <RefreshCw className="h-4 w-4" /> إعادة المحاولة
                </Button>
            </div>
        );
    }

    const conversionRate = stats.totalUsers > 0
        ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1)
        : "0";

    const avgRevenue = stats.paidUsers > 0
        ? (stats.revenueTotal / stats.paidUsers).toFixed(0)
        : "0";

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">لوحة إحصائيات المنصة</h2>
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lastUpdated.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={fetchStats}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                        تحديث
                    </Button>
                </div>
            </div>

            {/* Users Section */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    المستخدمون
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        icon={Users}
                        label="إجمالي المستخدمين"
                        value={stats.totalUsers}
                        color="text-primary"
                        bg="bg-primary/10"
                    />
                    <StatCard
                        icon={UserCheck}
                        label="مشتركون مدفوعون"
                        value={stats.paidUsers}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                    <StatCard
                        icon={UserX}
                        label="نسخة تجريبية"
                        value={stats.trialUsers}
                        color="text-amber-600"
                        bg="bg-amber-50"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="معدل التحويل"
                        value={`${conversionRate}%`}
                        sub="تجربة → مدفوع"
                        color="text-blue-600"
                        bg="bg-blue-50"
                    />
                </div>
            </div>

            {/* Activity Section */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    النشاط والتلخيصات
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        icon={FileText}
                        label="إجمالي التلخيصات"
                        value={stats.totalSummaries}
                        color="text-purple-600"
                        bg="bg-purple-50"
                    />
                    <StatCard
                        icon={Calendar}
                        label="تلخيصات اليوم"
                        value={stats.summariesToday}
                        color="text-sky-600"
                        bg="bg-sky-50"
                    />
                </div>
            </div>

            {/* Revenue Section */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    الإيرادات
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        icon={DollarSign}
                        label="إجمالي الإيرادات"
                        value={`${stats.revenueTotal.toFixed(0)} DZD`}
                        color="text-green-600"
                        bg="bg-green-50"
                    />
                    <StatCard
                        icon={CreditCard}
                        label="إجمالي المدفوعات"
                        value={stats.totalPayments}
                        sub={`متوسط ${avgRevenue} DZD/عميل`}
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                    />
                </div>
            </div>

            {/* Summary Bar */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <Activity className="h-4 w-4 text-primary" />
                        ملخص سريع
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* User distribution bar */}
                    <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                            <span>توزيع المستخدمين</span>
                            <span>{stats.totalUsers} مستخدم</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                            {stats.totalUsers > 0 && (
                                <>
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-700"
                                        style={{ width: `${(stats.paidUsers / stats.totalUsers) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-amber-400 transition-all duration-700"
                                        style={{ width: `${(stats.trialUsers / stats.totalUsers) * 100}%` }}
                                    />
                                </>
                            )}
                        </div>
                        <div className="flex gap-4 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                                مدفوع ({stats.paidUsers})
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                                تجريبي ({stats.trialUsers})
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
