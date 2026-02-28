import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SystemSettings {
    [key: string]: any;
}

export function useAdminSettings() {
    const queryClient = useQueryClient();

    const { data: settings = {}, isLoading } = useQuery<SystemSettings>({
        queryKey: ["/api/admin/settings"],
    });

    const updateSettingNode = async ({ key, value, description }: { key: string, value: any, description?: string }) => {
        const response = await fetch("/api/admin/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value, description }),
        });

        if (!response.ok) {
            const err = await response.json();
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
