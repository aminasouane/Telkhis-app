import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

interface SystemSettings {
    [key: string]: any;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
}

async function fetchSettings(): Promise<SystemSettings> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/settings", { headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch settings");
    }
    return res.json();
}

export function useAdminSettings() {
    const queryClient = useQueryClient();

    const { data: settings = {}, isLoading } = useQuery<SystemSettings>({
        queryKey: ["/api/admin/settings"],
        queryFn: fetchSettings,
    });

    const updateSettingNode = async ({ key, value, description }: { key: string, value: any, description?: string }) => {
        const headers = await getAuthHeaders();
        const response = await fetch("/api/admin/settings", {
            method: "PATCH",
            headers,
            body: JSON.stringify({ key, value, description }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Failed to update setting");
        }

        return response.json();
    };

    const updateSetting = useMutation({
        mutationFn: updateSettingNode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
        },
    });

    return {
        settings,
        isLoading,
        updateSetting: updateSetting.mutateAsync,
        isUpdating: updateSetting.isPending,
    };
}
