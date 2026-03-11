import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, User, LogOut, Crown, UserPlus, LogIn, LayoutDashboard, Shield } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { useLocation } from "wouter";
import { useAdminRole } from "@/hooks/useAdmin";
import { useUserStatus } from "@/hooks/useUserStatus";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, signOut, isAuthModalOpen, authModalTab, showAuthModal, closeAuthModal } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [, navigate] = useLocation();
  const { isAdmin } = useAdminRole();
  const { status } = useUserStatus();

  function getPlanDisplayName() {
    if (isAdmin) return "حساب إداري";
    if (!status || !status.planName || status.planName === "trial") return "تجربة مجانية";
    const name = status.planName.toLowerCase().trim();
    if (name === "basic" || name === "الخطة الأساسية") return "الخطة الأساسية";
    if (name === "student" || name === "خطة الطالب") return "خطة الطالب";
    if (name === "professional" || name === "خطة المحترف") return "خطة المحترف";
    return status.planName;
  }

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <span className="material-icons text-2xl">summarize</span>
              </div>
              <h1 className="text-xl font-semibold sm:text-2xl">تلخيصلي</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
                className="hover-elevate active-elevate-2"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>

              {/* Auth buttons */}
              {isAuthenticated ? (
                /* Logged in: user dropdown */
                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover-elevate relative"
                      data-testid="button-user-menu"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{user?.email}</p>
                      {getPlanDisplayName() === "الخطة الأساسية" ? (
                        <div className="mt-1">
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                            {getPlanDisplayName()}
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">{getPlanDisplayName()}</p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => { setIsDropdownOpen(false); navigate('/dashboard'); }}>
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      داشبوردي
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => { setIsDropdownOpen(false); navigate('/admin'); }}>
                        <Shield className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">لوحة الإدارة</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => { setIsDropdownOpen(false); window.location.href = '/subscribe'; }}>
                      <Crown className="h-4 w-4 text-amber-500" />
                      ترقية الاشتراك
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      onClick={handleSignOut}
                      data-testid="button-sign-out"
                    >
                      <LogOut className="h-4 w-4" />
                      تسجيل الخروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* Not logged in: login + signup + subscribe buttons */
                <div className="flex items-center gap-2" dir="rtl">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-sm"
                    onClick={() => showAuthModal('login')}
                    data-testid="button-login"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">تسجيل الدخول</span>
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 text-sm"
                    onClick={() => showAuthModal('signup')}
                    data-testid="button-signup"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">إنشاء حساب</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-sm text-amber-600 border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                    onClick={() => navigate('/subscribe')}
                    data-testid="button-subscribe"
                  >
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline">اشترك</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal — rendered globally inside Header so it's always available */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalTab}
      />
    </>
  );
}
