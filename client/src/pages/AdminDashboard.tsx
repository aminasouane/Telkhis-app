import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { useAdminRole, useAdminStats, useAdminUsers, useAdminUserDetail } from "@/hooks/useAdmin";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import {
    Users, FileText, CreditCard, TrendingUp, Search, RefreshCw, Shield,
    ChevronLeft, Clock, Mail, Calendar, ArrowLeft, Settings, ArrowRight
} from "lucide-react";

function StatCard({ icon: Icon, title, value, subtitle, color }: {
    icon: typeof Users; title: string; value: string | number; subtitle?: string; color: string;
}) {
    return (
        <Card className="shadow-sm border-0">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        <p className="text-xs text-muted-foreground">{title}</p>
                    </div>
                </div>
                {subtitle && <p className="text-[10px] text-muted-foreground mt-2">{subtitle}</p>}
            </CardContent>
        </Card>
    );
}

function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
    const { detail, isLoading } = useAdminUserDetail(userId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!detail?.user) return null;

    const user = detail.user;
    const activeSub = detail.subscriptions?.find((s: any) => s.status === "active");

    return (
        <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
                رجوع للقائمة
            </Button>

            {/* User info */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2 text-right">
                    <CardTitle className="text-base font-semibold text-card-foreground">معلومات المستخدم</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2" dir="rtl">
                    <div className="flex items-center flex-row-reverse justify-end gap-2 text-sm text-right">
                        <span>{user.email}</span>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center flex-row-reverse justify-end gap-2 text-sm text-right">
                        <Badge variant="outline" className="text-[10px]">{user.role}</Badge>
                        <Badge variant="outline" className="text-[10px]">{user.auth_provider}</Badge>
                        <span>{user.name || "بدون اسم"}</span>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>تسجيل: {new Date(user.created_at).toLocaleDateString("ar-DZ")}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Active subscription */}
            {activeSub && (
                <Card className="shadow-sm border-0">
                    <CardHeader className="pb-2 text-right">
                        <CardTitle className="text-base font-semibold text-card-foreground">الاشتراك النشط</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm" dir="rtl">
                        <div className="flex justify-between flex-row-reverse">
                            <Badge>{activeSub.plan_name}</Badge>
                            <span className="text-muted-foreground">الخطة</span>
                        </div>
                        <div className="flex justify-between flex-row-reverse">
                            <span>{Number(activeSub.trial_minutes_used || 0).toFixed(1)} / {activeSub.trial_minutes_limit}</span>
                            <span className="text-muted-foreground">الدقائق المستهلكة</span>
                        </div>
                        <div className="flex justify-between flex-row-reverse">
                            <span>{new Date(activeSub.start_date).toLocaleDateString("ar-DZ")}</span>
                            <span className="text-muted-foreground">البداية</span>
                        </div>
                        {activeSub.end_date && (
                            <div className="flex justify-between flex-row-reverse">
                                <span>{new Date(activeSub.end_date).toLocaleDateString("ar-DZ")}</span>
                                <span className="text-muted-foreground">النهاية</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Recent summaries */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2 text-right">
                    <CardTitle className="text-base font-semibold text-card-foreground">
                        آخر التلخيصات ({detail.summaries?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent dir="rtl">
                    {detail.summaries?.length > 0 ? (
                        <div className="space-y-2">
                            {detail.summaries.slice(0, 10).map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between flex-row-reverse text-sm border-b last:border-0 pb-2">
                                    <span className="text-xs text-muted-foreground shrink-0 text-left">
                                        {new Date(s.created_at).toLocaleDateString("ar-DZ")}
                                    </span>
                                    <span className="truncate flex-1 text-right">{s.title || "بدون عنوان"}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">لا توجد تلخيصات</p>
                    )}
                </CardContent>
            </Card>

            {/* Usage history */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2 text-right">
                    <CardTitle className="text-base font-semibold text-card-foreground">
                        سجل الاستخدام (آخر 30 يوم)
                    </CardTitle>
                </CardHeader>
                <CardContent dir="rtl">
                    {detail.usage?.length > 0 ? (
                        <div className="space-y-1">
                            {detail.usage.slice(0, 15).map((u: any) => (
                                <div key={u.id} className="flex justify-between flex-row-reverse text-sm">
                                    <span className="font-medium text-left">{Number(u.minutes_used).toFixed(1)} دقيقة</span>
                                    <span className="text-muted-foreground text-right">{u.date}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">لا يوجد استخدام</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function AdminDashboard() {
    const [, navigate] = useLocation();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { isAdmin, isLoading: roleLoading } = useAdminRole();

    const [search, setSearch] = useState("");
    const [planFilter, setPlanFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const { stats, isLoading: statsLoading, refetch: refetchStats } = useAdminStats();
    const { users, total, isLoading: usersLoading, refetch: refetchUsers } = useAdminUsers(search, planFilter, page);

    // Auth check
    if (!authLoading && !isAuthenticated) {
        navigate("/");
        return null;
    }

    // Loading
    if (authLoading || roleLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Not admin
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background flex flex-col" dir="rtl">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Shield className="h-16 w-16 text-destructive mx-auto" />
                        <h2 className="text-xl font-bold text-foreground">ممنوع الوصول</h2>
                        <p className="text-muted-foreground">ليس لديك صلاحية الوصول لهذه الصفحة</p>
                        <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col" dir="rtl">
            <Header />

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">

                {/* Back button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-primary"
                    onClick={() => navigate("/")}
                >
                    <ArrowRight className="h-4 w-4" />
                    العودة للصفحة الرئيسية
                </Button>

                <Tabs defaultValue="users" className="w-full">
                    {/* Header with Title and TabsList */}
                    <div className="flex flex-col sm:flex-row-reverse sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center flex-row-reverse gap-3">
                            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                <Shield className="h-6 w-6 text-destructive" />
                            </div>
                            <div className="text-right">
                                <h1 className="text-xl font-bold text-foreground">لوحة الإدارة</h1>
                                <p className="text-sm text-muted-foreground">إدارة النظام والمستخدمين</p>
                            </div>
                        </div>
                        <TabsList className="flex flex-row-reverse">
                            <TabsTrigger value="users" className="gap-2 flex-row-reverse">
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">المستخدمون</span>
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="gap-2 flex-row-reverse">
                                <Settings className="h-4 w-4" />
                                <span className="hidden sm:inline">إعدادات النظام</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="users" className="space-y-6 outline-none focus:ring-0">

                        {/* Stats grid */}
                        {!statsLoading && stats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard icon={Users} title="إجمالي المستخدمين" value={stats.totalUsers} color="bg-chart-1" />
                                <StatCard icon={CreditCard} title="مشتركون" value={stats.paidUsers}
                                    subtitle={`${stats.trialUsers} تجربة مجانية`} color="bg-chart-2" />
                                <StatCard icon={FileText} title="التلخيصات اليوم" value={stats.summariesToday}
                                    subtitle={`${stats.totalSummaries} إجمالي`} color="bg-chart-3" />
                                <StatCard icon={TrendingUp} title="الإيرادات (د.ج)"
                                    value={stats.revenueTotal.toLocaleString()} color="bg-chart-4" />
                            </div>
                        )}

                        {/* User detail view or user list */}
                        {selectedUserId ? (
                            <UserDetailPanel userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
                        ) : (
                            <Card className="shadow-sm border-0">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="text-base font-semibold text-card-foreground">المستخدمون ({total})</span>
                                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => { refetchStats(); refetchUsers(); }}>
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            تحديث
                                        </Button>
                                    </CardTitle>

                                    {/* Search and filters */}
                                    <div className="flex gap-2 mt-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="بحث بالبريد أو الاسم..."
                                                value={search}
                                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                                className="pr-10"
                                            />
                                        </div>
                                        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                                            <SelectTrigger className="w-36">
                                                <SelectValue placeholder="الكل" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">الكل</SelectItem>
                                                <SelectItem value="trial">تجربة</SelectItem>
                                                <SelectItem value="basic">أساسية</SelectItem>
                                                <SelectItem value="student">طالب</SelectItem>
                                                <SelectItem value="professional">محترف</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    {usersLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                                        </div>
                                    ) : users.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">لا يوجد مستخدمون</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {users.map((u) => {
                                                const activeSub = (u.subscriptions || []).find((s: any) => s.status === "active");
                                                const planName = activeSub?.plan_name || "trial";
                                                const planLabels: Record<string, string> = {
                                                    trial: "تجربة", basic: "أساسية", student: "طالب", professional: "محترف"
                                                };
                                                const planColors: Record<string, string> = {
                                                    trial: "bg-muted text-muted-foreground",
                                                    basic: "bg-blue-100 text-blue-700",
                                                    student: "bg-purple-100 text-purple-700",
                                                    professional: "bg-amber-100 text-amber-700",
                                                };

                                                return (
                                                    <div
                                                        key={u.id}
                                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors border border-transparent hover:border-border"
                                                        onClick={() => setSelectedUserId(u.id)}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium text-foreground truncate">
                                                                    {u.email}
                                                                </p>
                                                                {u.role === "admin" && (
                                                                    <Badge variant="outline" className="text-[10px] text-destructive border-border">أدمن</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs text-muted-foreground">
                                                                    {u.name || "—"}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">•</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(u.created_at).toLocaleDateString("ar-DZ")}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Badge className={`text-[10px] px-2 py-0.5 rounded-full ${planColors[planName] || planColors.trial}`}>
                                                                {planLabels[planName] || planName}
                                                            </Badge>
                                                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {total > 20 && (
                                        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={page <= 1}
                                                onClick={() => setPage((p) => p - 1)}
                                            >
                                                السابق
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                                صفحة {page} من {Math.ceil(total / 20)}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={page >= Math.ceil(total / 20)}
                                                onClick={() => setPage((p) => p + 1)}
                                            >
                                                التالي
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="settings" className="outline-none focus:ring-0">
                        <AdminSettingsTab />
                    </TabsContent>
                </Tabs>
            </main>

            <Footer />
        </div>
    );
}
