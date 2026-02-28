import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

interface Summary {
    id: string;
    title: string;
    content: string;
    transcript: string;
    key_points: string[];
    language: string;
    audio_duration: number | null;
    created_at: string;
}

export function useSummaries() {
    const { user, session } = useAuth();
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummaries = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/summaries?userId=${user.id}`);
            if (!res.ok) throw new Error("Failed to fetch summaries");
            const data = await res.json();
            setSummaries(data.summaries || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const deleteSummary = useCallback(async (id: string) => {
        if (!user) return false;
        try {
            const res = await fetch(`/api/summaries/${id}?userId=${user.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete");
            setSummaries((prev) => prev.filter((s) => s.id !== id));
            return true;
        } catch {
            return false;
        }
    }, [user]);

    useEffect(() => {
        fetchSummaries();
    }, [fetchSummaries]);

    return { summaries, isLoading, error, refetch: fetchSummaries, deleteSummary };
}
