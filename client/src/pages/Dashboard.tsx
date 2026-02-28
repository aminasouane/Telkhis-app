import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sun, Mic, LayoutDashboard, FileText, Settings, RefreshCw, ArrowRight, BarChart3 } from "lucide-react";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import SummariesTab from "@/components/dashboard/SummariesTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import AdminStatsTab from "@/components/dashboard/AdminStatsTab";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useAdminRole } from "@/hooks/useAdmin";

export default function Dashboard() {
    const [, navigate] = useLocation();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const { isAdmin } = useAdminRole();  // uses /api/user/role — reliable, not affected by loading defaults
    const { status } = useUserStatus();

    // Redirect if not authenticated
    if (!authLoading && !isAuthenticated) {
        navigate("/");
        return null;
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col" dir="rtl">
            <Header />

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5">

                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-primary"
                    onClick={() => navigate("/")}
                >
                    <ArrowRight className="h-4 w-4" />
                    العودة للصفحة الرئيسية
                </Button>

                {/* User greeting */}
                <div className="flex items-center gap-3 flex-row-reverse justify-end">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Sun className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-right">
                        <h1 className="text-xl font-bold text-foreground">
                            مرحباً{user?.email ? " بك" : "!"}
                        </h1>
                        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className={`grid w-full rounded-xl bg-card shadow-sm h-11 ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
                        <TabsTrigger
                            value="overview"
                            className="gap-1.5 text-xs data-[state=active]:bg-primary/10 rounded-lg"
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            نظرة عامة
                        </TabsTrigger>
                        <TabsTrigger
                            value="summaries"
                            className="gap-1.5 text-xs data-[state=active]:bg-primary/10 rounded-lg"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            التلخيصات
                        </TabsTrigger>
                        <TabsTrigger
                            value="settings"
                            className="gap-1.5 text-xs data-[state=active]:bg-primary/10 rounded-lg"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            الإعدادات
                        </TabsTrigger>

                        {/* Admin-only tab */}
                        {isAdmin && (
                            <TabsTrigger
                                value="admin"
                                className="gap-1.5 text-xs data-[state=active]:bg-primary/10 rounded-lg"
                            >
                                <BarChart3 className="h-3.5 w-3.5" />
                                إحصائيات
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        <SubscriptionCard />
                        <Button
                            className="w-full gap-2 py-5 text-base font-semibold"
                            onClick={() => navigate("/")}
                        >
                            <Mic className="h-5 w-5" />
                            ابدأ تلخيصاً جديداً
                        </Button>
                    </TabsContent>

                    {/* Summaries Tab */}
                    <TabsContent value="summaries">
                        <SummariesTab />
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings">
                        <SettingsTab />
                    </TabsContent>

                    {/* Admin Stats Tab */}
                    {isAdmin && (
                        <TabsContent value="admin">
                            <AdminStatsTab />
                        </TabsContent>
                    )}
                </Tabs>
            </main>

            <Footer />
        </div>
    );
}
