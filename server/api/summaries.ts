import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase-admin";

export async function getSummaries(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Fetch summaries for the authenticated user only
    const { data: summaries, error } = await supabaseAdmin
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching summaries:', error);
      return res.status(500).json({ error: "Failed to fetch summaries" });
    }

    res.json({ summaries: summaries || [] });
  } catch (error) {
    console.error('Error in getSummaries:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSummaryById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Fetch summary and verify ownership
    const { data: summary, error } = await supabaseAdmin
      .from('summaries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    res.json({ summary });
  } catch (error) {
    console.error('Error in getSummaryById:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteSummary(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Delete summary only if user owns it
    const { error } = await supabaseAdmin
      .from('summaries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting summary:', error);
      return res.status(500).json({ error: "Failed to delete summary" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in deleteSummary:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
