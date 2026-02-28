import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

interface AdminStats {
    totalUsers: number;
    paidUsers: number;
    trialUsers: number;
    totalSummaries: number;
    summariesToday: number;
    totalPayments: number;
    revenueTotal: number;
}

interface AdminUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    auth_provider: string;
    subscription_type: string;
    created_at: string;
    subscriptions: Array<{
        plan_name: string;
        status: string;
        trial_minutes_used: number;
        trial_minutes_limit: number;
        start_date: string;
        end_date: string | null;
    }>;
}

async function adminFetch(url: string, session: any) {
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${session?.access_token}`,
        },
    });
    if (res.status === 403) throw new Error("NOT_ADMIN");
    if (!res.ok) throw new Error("API Error");
    return res.json();
}

export function useAdminRole() {
    const { session, isAuthenticated } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !session) {
            setIsAdmin(false);
            setIsLoading(false);
            return;
        }
        adminFetch("/api/user/role", session)
            .then((data) => setIsAdmin(data.role === "admin"))
            .catch(() => setIsAdmin(false))
            .finally(() => setIsLoading(false));
    }, [session, isAuthenticated]);

    return { isAdmin, isLoading };
}

export function useAdminStats() {
    const { session } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refetch = useCallback(async () => {
        if (!session) return;
        setIsLoading(true);
        try {
            const data = await adminFetch("/api/admin/stats", session);
            setStats(data);
        } catch {
            setStats(null);
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    useEffect(() => { refetch(); }, [refetch]);

    return { stats, isLoading, refetch };
}

export function useAdminUsers(search?: string, plan?: string, page = 1) {
    const { session } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const refetch = useCallback(async () => {
        if (!session) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (plan && plan !== "all") params.set("plan", plan);
            params.set("page", String(page));
            const data = await adminFetch(`/api/admin/users?${params}`, session);
            setUsers(data.users);
            setTotal(data.total);
        } catch {
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, [session, search, plan, page]);

    useEffect(() => { refetch(); }, [refetch]);

    return { users, total, isLoading, refetch };
}

export function useAdminUserDetail(userId: string | null) {
    const { session } = useAuth();
    const [detail, setDetail] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!userId || !session) { setDetail(null); return; }
        setIsLoading(true);
        adminFetch(`/api/admin/users/${userId}`, session)
            .then(setDetail)
            .catch(() => setDetail(null))
            .finally(() => setIsLoading(false));
    }, [userId, session]);

    return { detail, isLoading };
}
