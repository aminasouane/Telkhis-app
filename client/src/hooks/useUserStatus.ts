import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";

export interface UserStatus {
    isPaid: boolean;
    hasTrial: boolean;
    trialState: "ACTIVE" | "DAILY_LIMIT" | "USED_UP" | "EXPIRED" | "PAID";
    planName: string;
    minutesUsed: number;
    minutesLimit: number;
    minutesRemaining: number;
    dailyMinutesUsed: number;
    dailyMinutesLimit: number | null;
    dailyMinutesRemaining: number | null;
    daysRemaining: number | null;
    canProcess: boolean;
    blockReason: string | null;
}

const DEFAULT_STATUS: UserStatus = {
    isPaid: false,
    hasTrial: true,
    trialState: "ACTIVE",
    planName: "trial",
    minutesUsed: 0,
    minutesLimit: 210,
    minutesRemaining: 210,
    dailyMinutesUsed: 0,
    dailyMinutesLimit: 30,
    dailyMinutesRemaining: 30,
    daysRemaining: 7,
    canProcess: true,
    blockReason: null,
};

export function useUserStatus() {
    const { session, isAuthenticated, appUserId } = useAuth();

    const query = useQuery<UserStatus>({
        queryKey: ["userStatus", appUserId],
        queryFn: async () => {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`;
            }

            const res = await fetch("/api/user/status", { headers });
            if (!res.ok) throw new Error("Failed to fetch user status");
            return res.json();
        },
        enabled: isAuthenticated && !!appUserId,
        staleTime: 30_000,        // consider fresh for 30s
        refetchOnWindowFocus: true,
    });

    return {
        status: query.data ?? DEFAULT_STATUS,
        isLoading: query.isLoading,
        refetch: query.refetch,
        error: query.error,
    };
}
