import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
    User, KeyRound, Eye, EyeOff, RefreshCw, Trash2, AlertTriangle
} from "lucide-react";

export default function SettingsTab() {
    const { user, signOut } = useAuth();

    // Profile state
    const [name, setName] = useState(user?.user_metadata?.name || "");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);

    // Password state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState<{ text: string; ok: boolean } | null>(null);

    // Delete account state
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleProfileUpdate = async () => {
        setProfileLoading(true);
        setProfileMsg(null);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id, name }),
            });
            if (!res.ok) throw new Error("Failed");
            setProfileMsg({ text: "✅ تم تحديث الاسم بنجاح!", ok: true });
        } catch {
            setProfileMsg({ text: "حدث خطأ أثناء التحديث", ok: false });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (newPassword.length < 6) {
            setPwMessage({ text: "كلمة السر يجب أن تكون 6 أحرف على الأقل", ok: false });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwMessage({ text: "كلمتا السر غير متطابقتين", ok: false });
            return;
        }
        setPwLoading(true);
        setPwMessage(null);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPwLoading(false);
        if (error) {
            setPwMessage({ text: "حدث خطأ: " + error.message, ok: false });
        } else {
            setPwMessage({ text: "✅ تم تعيين كلمة السر بنجاح!", ok: true });
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            const res = await fetch("/api/user/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id }),
            });
            if (!res.ok) throw new Error("Failed");
            await signOut();
            window.location.href = "/";
        } catch {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Profile card */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                        <User className="h-5 w-5 text-primary" />
                        المعلومات الشخصية
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs">البريد الإلكتروني</Label>
                        <Input value={user?.email || ""} disabled className="bg-gray-50 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">الاسم</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="أدخل اسمك"
                        />
                    </div>
                    {profileMsg && (
                        <p className={`text-xs font-medium ${profileMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                            {profileMsg.text}
                        </p>
                    )}
                    <Button
                        className="w-full"
                        onClick={handleProfileUpdate}
                        disabled={profileLoading || !name.trim()}
                    >
                        {profileLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "حفظ الاسم"}
                    </Button>
                </CardContent>
            </Card>

            {/* Password card */}
            <Card className="shadow-sm border-0">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                        <KeyRound className="h-5 w-5 text-muted-foreground" />
                        تعيين كلمة السر
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                        إذا سجّلت دخولك عبر Google، يمكنك هنا تعيين كلمة سر للدخول بالبريد الإلكتروني.
                    </p>
                    <div className="space-y-1">
                        <Label className="text-xs">كلمة السر الجديدة</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="6 أحرف على الأقل"
                                className="pl-10"
                            />
                            <button
                                type="button"
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                                onClick={() => setShowPassword((p) => !p)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">تأكيد كلمة السر</Label>
                        <Input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="أعد كتابة كلمة السر"
                        />
                    </div>
                    {pwMessage && (
                        <p className={`text-xs font-medium ${pwMessage.ok ? "text-emerald-600" : "text-red-500"}`}>
                            {pwMessage.text}
                        </p>
                    )}
                    <Button
                        className="w-full"
                        onClick={handlePasswordChange}
                        disabled={pwLoading || !newPassword || !confirmPassword}
                    >
                        {pwLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "حفظ كلمة السر"}
                    </Button>
                </CardContent>
            </Card>

            {/* Delete account */}
            <Card className="shadow-sm border-0 border-red-100">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        منطقة الخطر
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                        حذف الحساب نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بياناتك وتلخيصاتك.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full gap-2 border-red-300 text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                                حذف حسابي نهائياً
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    سيتم حذف حسابك وجميع بياناتك وتلخيصاتك نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="sm:justify-start gap-2">
                                <AlertDialogAction
                                    onClick={handleDeleteAccount}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "نعم، احذف حسابي"}
                                </AlertDialogAction>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
