import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users, FileText, CreditCard, TrendingUp,
    RefreshCw, UserCheck, UserX, Calendar,
    BarChart3, Activity, DollarSign, Clock,
    Infinity, ArrowUp
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from "recharts";
import { supabase } from "@/lib/supabaseClient";

interface AdminStats {
    totalUsers: number;
    paidUsers: number;
    trialUsers: number;
    totalSummaries: number;
    summariesToday: number;
    totalPayments: number;
    revenueTotal: number;
    newUsersThisWeek?: number;
    activeUsersToday?: number;
}

interface GrowthPoint { date: string; newUsers: number; cumulative: number; }
interface ActivityPoint { date: string; count: number; }

interface GrowthStats {
    userGrowth: GrowthPoint[];
    summaryActivity: ActivityPoint[];
    planDistribution: Record<string, number>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
}

const PLAN_LABELS: Record<string, string> = {
    trial: "تجريبي",
    basic: "أساسي",
    student: "طالب",
    professional: "محترف",
    admin: "إداري",
};

const PLAN_COLORS: Record<string, string> = {
    trial: "#94a3b8",
    basic: "#3b82f6",
    student: "#a855f7",
    professional: "#f59e0b",
    admin: "hsl(182 55% 45%)",
};

function StatCard({ icon: Icon, label, value, sub, badge, color = "text-primary", bg = "bg-primary/10" }: {
    icon: typeof Users; label: string; value: string | number;
    sub?: string; badge?: string; color?: string; bg?: string;
}) {
    return (
        <Card className="shadow-sm border-0">
            <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0 flex-1 text-right">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className="flex items-center justify-end gap-2">
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        {badge && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{badge}</Badge>}
                    </div>
                    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-md text-right text-sm">
            <p className="text-muted-foreground text-xs mb-1">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} style={{ color: entry.color }} className="font-medium">
                    {entry.name}: {entry.value}
                </p>
            ))}
        </div>
    );
};

export default function AdminStatsTab() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [growth, setGrowth] = useState<GrowthStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingGrowth, setLoadingGrowth] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/admin/stats", { headers });
            if (res.ok) {
                setStats(await res.json());
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error("Failed to fetch admin stats", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchGrowth = async () => {
        setLoadingGrowth(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/admin/growth?days=30", { headers });
            if (res.ok) setGrowth(await res.json());
        } catch (e) {
            console.error("Failed to fetch growth stats", e);
        } finally {
            setLoadingGrowth(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchGrowth();
    }, []);

    const handleRefresh = () => {
        fetchStats();
        fetchGrowth();
    };

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
                <Button variant="ghost" size="sm" className="mt-3 gap-2" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" /> إعادة المحاولة
                </Button>
            </div>
        );
    }

    const conversionRate = stats.totalUsers > 0
        ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1) : "0";

    // Growth chart data (last 30 days, show every 3 days as label)
    const chartData = (growth?.userGrowth || []).map((d, i) => ({
        date: formatDate(d.date),
        "مستخدمون جدد": d.newUsers,
        "الإجمالي": d.cumulative,
        _i: i,
    })).filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % 5 === 0 || (arr[i] as any)["مستخدمون جدد"] > 0);

    const activityData = (growth?.summaryActivity || []).map(d => ({
        date: formatDate(d.date),
        "تلخيصات": d.count,
    })).filter((_, i, arr) => i % 3 === 0 || i === arr.length - 1);

    const planDist = growth?.planDistribution || {};
    const planChartData = Object.entries(planDist).map(([plan, count]) => ({
        name: PLAN_LABELS[plan] || plan,
        count: count as number,
        fill: PLAN_COLORS[plan] || "#94a3b8",
    }));

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">إحصائيات المنصة</h2>
                    <Badge variant="outline" className="text-[10px]">آخر 30 يوم</Badge>
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lastUpdated.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                    )}
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleRefresh} disabled={loading || loadingGrowth}>
                        <RefreshCw className={`h-3 w-3 ${(loading || loadingGrowth) ? "animate-spin" : ""}`} />
                        تحديث
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Users} label="إجمالي المستخدمين" value={stats.totalUsers}
                    badge={stats.newUsersThisWeek ? `+${stats.newUsersThisWeek} هذا الأسبوع` : undefined}
                    color="text-primary" bg="bg-primary/10" />
                <StatCard icon={UserCheck} label="مشتركون مدفوعون" value={stats.paidUsers}
                    sub={`معدل التحويل ${conversionRate}%`}
                    color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard icon={UserX} label="تجريبيون" value={stats.trialUsers}
                    color="text-amber-600" bg="bg-amber-50" />
                <StatCard icon={Activity} label="نشطون اليوم" value={stats.activeUsersToday ?? "—"}
                    color="text-sky-600" bg="bg-sky-50" />
                <StatCard icon={FileText} label="تلخيصات اليوم" value={stats.summariesToday}
                    sub={`${stats.totalSummaries} إجمالي`}
                    color="text-purple-600" bg="bg-purple-50" />
                <StatCard icon={DollarSign} label="الإيرادات الإجمالية" value={`${stats.revenueTotal.toFixed(0)} DZD`}
                    sub={`${stats.totalPayments} مدفوعة`}
                    color="text-green-600" bg="bg-green-50" />
            </div>

            {/* User Growth Chart */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-end gap-2 text-sm font-semibold text-card-foreground">
                        نمو المستخدمين (30 يوم)
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingGrowth ? (
                        <div className="h-40 flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(182 55% 45%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(182 55% 45%)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", direction: "rtl" }} />
                                <Area type="monotone" dataKey="الإجمالي" stroke="hsl(182 55% 45%)" strokeWidth={2} fill="url(#gradTotal)" dot={false} />
                                <Area type="monotone" dataKey="مستخدمون جدد" stroke="#10b981" strokeWidth={2} fill="url(#gradNew)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Summary Activity Chart */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-end gap-2 text-sm font-semibold text-card-foreground">
                        نشاط التلخيصات (30 يوم)
                        <FileText className="h-4 w-4 text-purple-500" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingGrowth ? (
                        <div className="h-40 flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="تلخيصات" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Plan Distribution */}
            {planChartData.length > 0 && (
                <Card className="shadow-sm border-0">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-end gap-2 text-sm font-semibold text-card-foreground">
                            توزيع الخطط النشطة
                            <CreditCard className="h-4 w-4 text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={planChartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} tickLine={false} width={50} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="مستخدمون" radius={[0, 4, 4, 0]}>
                                    {planChartData.map((entry, index) => (
                                        <rect key={index} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* User distribution bar */}
            <Card className="shadow-sm border-0">
                <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>توزيع المستخدمين ({stats.totalUsers} مجموع)</span>
                        <div className="flex gap-3">
                            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />مدفوع ({stats.paidUsers})</span>
                            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />تجريبي ({stats.trialUsers})</span>
                        </div>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                        {stats.totalUsers > 0 && (
                            <>
                                <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(stats.paidUsers / stats.totalUsers) * 100}%` }} />
                                <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${(stats.trialUsers / stats.totalUsers) * 100}%` }} />
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
