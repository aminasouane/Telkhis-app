import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mail } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

// Simple Google icon SVG
function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" className="ml-2">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
        </svg>
    );
}

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'signup' }: AuthModalProps) {
    const { closeAuthModal } = useAuth();
    const [activeTab, setActiveTab] = useState<string>(defaultTab);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleClose = () => {
        onClose();
        closeAuthModal();
        setError('');
        setSuccessMessage('');
        setEmail('');
        setPassword('');
        setName('');
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            // Page will redirect, no need to close modal
        } catch (err: any) {
            setError(err.message || 'فشل تسجيل الدخول بجوجل');
            setGoogleLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        if (password.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name: name || undefined },
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            setSuccessMessage('تم إنشاء حسابك! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.');
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('already registered')) {
                setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.');
            } else {
                setError(msg || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            handleClose();
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('Invalid login')) {
                setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
            } else if (msg.includes('Email not confirmed')) {
                setError('يرجى تفعيل بريدك الإلكتروني أولاً');
            } else {
                setError(msg || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-bold text-primary">
                        تلخيصلي
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(''); setSuccessMessage(''); }}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
                        <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                    </TabsList>

                    {/* Sign Up Tab */}
                    <TabsContent value="signup" className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground text-center">
                            أنشئ حساباً مجانياً واستفد من الفترة التجريبية
                        </p>

                        {/* Google Sign In */}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 h-11"
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading || loading}
                        >
                            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                            التسجيل بحساب جوجل
                        </Button>

                        <div className="flex items-center gap-3">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">أو</span>
                            <Separator className="flex-1" />
                        </div>

                        <form onSubmit={handleSignUp} className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="signup-name">الاسم (اختياري)</Label>
                                <Input
                                    id="signup-name"
                                    type="text"
                                    placeholder="اسمك"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={loading}
                                    className="text-right"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                                <Input
                                    id="signup-email"
                                    type="email"
                                    placeholder="example@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    className="text-right"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="signup-password">كلمة المرور</Label>
                                <Input
                                    id="signup-password"
                                    type="password"
                                    placeholder="6 أحرف على الأقل"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="text-right"
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive text-center bg-destructive/10 rounded-md p-2">{error}</p>
                            )}
                            {successMessage && (
                                <p className="text-sm text-green-600 text-center bg-green-50 dark:bg-green-950 rounded-md p-2">{successMessage}</p>
                            )}

                            <Button type="submit" className="w-full h-11" disabled={loading || googleLoading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Mail className="h-4 w-4 ml-2" />}
                                إنشاء حساب مجاني
                            </Button>
                        </form>
                    </TabsContent>

                    {/* Login Tab */}
                    <TabsContent value="login" className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground text-center">
                            مرحباً بعودتك
                        </p>

                        {/* Google Sign In */}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 h-11"
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading || loading}
                        >
                            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                            تسجيل الدخول بجوجل
                        </Button>

                        <div className="flex items-center gap-3">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">أو</span>
                            <Separator className="flex-1" />
                        </div>

                        <form onSubmit={handleSignIn} className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="login-email">البريد الإلكتروني</Label>
                                <Input
                                    id="login-email"
                                    type="email"
                                    placeholder="example@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    className="text-right"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="login-password">كلمة المرور</Label>
                                <Input
                                    id="login-password"
                                    type="password"
                                    placeholder="كلمة المرور"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="text-right"
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive text-center bg-destructive/10 rounded-md p-2">{error}</p>
                            )}

                            <Button type="submit" className="w-full h-11" disabled={loading || googleLoading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Mail className="h-4 w-4 ml-2" />}
                                تسجيل الدخول
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
