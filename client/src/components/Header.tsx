import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { getUserData, getUserSubscription } from "@/services/dbService";
import type { UserData, SubscriptionData } from "@/services/dbService";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  useEffect(() => {
    // Clear stale data immediately and set loading state
    setUserData(null);
    setSubscription(null);
    setIsLoadingUserData(true);

    if (user) {
      // Capture current user ID to prevent race conditions
      const currentUserId = user.id;
      
      Promise.all([
        getUserData(currentUserId),
        getUserSubscription(currentUserId)
      ]).then(([data, sub]) => {
        // Only update state if user hasn't changed during fetch
        if (user && user.id === currentUserId) {
          setUserData(data);
          setSubscription(sub);
        }
        setIsLoadingUserData(false);
      }).catch(() => {
        setIsLoadingUserData(false);
      });
    } else {
      // No user - loading complete
      setIsLoadingUserData(false);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getSubscriptionBadge = () => {
    const type = userData?.subscription_type || 'free';
    const labels = {
      free: 'مجاني',
      premium: 'بريميوم',
      pro_plus: 'برو بلس'
    };
    return labels[type as keyof typeof labels] || 'مجاني';
  };

  // Helper function to check if user is authenticated (not guest)
  const isAuthenticatedUser = (): boolean => {
    if (!userData || !userData.user_type) return false;
    
    // Normalize to lowercase for case-insensitive comparison
    const userType = userData.user_type.toLowerCase();
    const allowedTypes = ['free', 'premium', 'pro_plus'];
    
    return allowedTypes.includes(userType);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="material-icons text-2xl">summarize</span>
            </div>
            <h1 className="text-xl font-semibold sm:text-2xl">تلخيصلي</h1>
          </div>

          <div className="flex items-center gap-2">
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

            {/* Profile icon - shown for authenticated users only (hidden for guests) */}
            {/* Only show after data loads and for verified authenticated user types */}
            {user && !isLoadingUserData && isAuthenticatedUser() && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {subscription?.status === 'active' ? (
                    // Full profile menu for subscribed users
                    <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                      <Badge variant="secondary" data-testid="badge-subscription">
                        {getSubscriptionBadge()}
                      </Badge>
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline" data-testid="text-user-name">
                        {userData?.name || user.email?.split('@')[0]}
                      </span>
                    </Button>
                  ) : (
                    // Simple logout button for authenticated users without subscription
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      data-testid="button-user-menu"
                      className="hover-elevate active-elevate-2"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {subscription?.status === 'active' ? (
                    // Full menu for subscribed users
                    <>
                      <DropdownMenuLabel>
                        <div className="flex flex-col gap-1">
                          <span>{userData?.name || user.email?.split('@')[0]}</span>
                          <span className="text-xs font-normal text-muted-foreground" dir="ltr">
                            {user.email}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} data-testid="button-logout">
                        <LogOut className="ml-2 h-4 w-4" />
                        <span>تسجيل الخروج</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    // Simple logout option for authenticated users without subscription
                    <DropdownMenuItem onClick={handleSignOut} data-testid="button-logout">
                      <LogOut className="ml-2 h-4 w-4" />
                      <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
