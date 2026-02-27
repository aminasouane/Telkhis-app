/**
 * Database layer - Supabase Postgres
 * Replaces the previous SQLite (better-sqlite3) implementation.
 * All operations use supabaseAdmin (service_role) to bypass RLS.
 */
import { supabaseAdmin } from './supabase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  auth_provider: string;
  user_type: string;
  subscription_type: string;
  created_at: string;
  updated_at: string;
}

export interface Summary {
  id: string;
  user_id: string;
  title: string;
  content: string;
  transcript: string;
  key_points: string[];
  language: string;
  audio_duration: number | null;
  created_at: string;
}

export interface Usage {
  id: string;
  user_id: string;
  date: string;
  minutes_used: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  status: 'active' | 'expired' | 'cancelled';
  trial_minutes_used: number;
  trial_minutes_limit: number;
  trial_daily_limit: number;
  trial_start_date: string;
  payment_provider: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  preferred_language: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ─── User operations ──────────────────────────────────────────────────────────

export async function getOrCreateUser(userId: string, email?: string, name?: string, provider?: string): Promise<User> {
  // Try to get existing user
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) return existing as User;

  // Create new user
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      email: email || null,
      name: name || null,
      auth_provider: provider || 'email',
      user_type: 'free',
      subscription_type: 'free',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);

  // Create default trial subscription
  await supabaseAdmin.from('subscriptions').insert({
    user_id: userId,
    plan_name: 'trial',
    status: 'active',
    trial_minutes_used: 0,
    trial_minutes_limit: 210,
    trial_daily_limit: 30,
  });

  return data as User;
}

export async function getUser(userId: string): Promise<User | undefined> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return data as User | undefined;
}

// ─── Summary operations ───────────────────────────────────────────────────────

export async function saveSummary(data: {
  userId: string;
  title: string;
  content: string;
  transcript: string;
  keyPoints: string[];
  language: string;
  audioDuration?: number;
}): Promise<Summary> {
  // Ensure user exists
  await getOrCreateUser(data.userId);

  const { data: row, error } = await supabaseAdmin
    .from('summaries')
    .insert({
      user_id: data.userId,
      title: data.title,
      content: data.content,
      transcript: data.transcript,
      key_points: data.keyPoints || [],
      language: data.language,
      audio_duration: data.audioDuration || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save summary: ${error.message}`);
  return row as Summary;
}

export async function getSummaries(userId: string): Promise<Summary[]> {
  const { data, error } = await supabaseAdmin
    .from('summaries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get summaries: ${error.message}`);
  return (data || []) as Summary[];
}

export async function getSummaryById(summaryId: string, userId: string): Promise<Summary | undefined> {
  const { data } = await supabaseAdmin
    .from('summaries')
    .select('*')
    .eq('id', summaryId)
    .eq('user_id', userId)
    .single();
  return data as Summary | undefined;
}

export async function deleteSummary(summaryId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('summaries')
    .delete()
    .eq('id', summaryId)
    .eq('user_id', userId);
  return !error;
}

// ─── Usage operations ─────────────────────────────────────────────────────────

export async function getTodayUsage(userId: string): Promise<Usage | undefined> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabaseAdmin
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  return data as Usage | undefined;
}

export async function getTotalUsage(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('usage')
    .select('minutes_used')
    .eq('user_id', userId);
  if (!data) return 0;
  return data.reduce((sum: number, row: any) => sum + (row.minutes_used || 0), 0);
}

export async function getFirstUsageDate(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('usage')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .limit(1)
    .single();
  return data?.date || null;
}

export async function recordUsage(userId: string, minutes: number): Promise<Usage> {
  const today = new Date().toISOString().split('T')[0];
  await getOrCreateUser(userId);

  const { data: existing } = await supabaseAdmin
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('usage')
      .update({ minutes_used: (existing.minutes_used || 0) + minutes })
      .eq('user_id', userId)
      .eq('date', today)
      .select()
      .single();
    if (error) throw new Error(`Failed to update usage: ${error.message}`);
    return data as Usage;
  } else {
    const { data, error } = await supabaseAdmin
      .from('usage')
      .insert({ user_id: userId, date: today, minutes_used: minutes })
      .select()
      .single();
    if (error) throw new Error(`Failed to insert usage: ${error.message}`);
    return data as Usage;
  }
}

// ─── Subscription operations ──────────────────────────────────────────────────

export async function getActiveSubscription(userId: string): Promise<Subscription | undefined> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data as Subscription | undefined;
}

export async function createSubscription(data: {
  userId: string;
  planName: string;
  planId?: string;
  totalMinutes?: number;
  endDate?: string;
  paymentProvider?: string;
}): Promise<Subscription> {
  // Cancel existing active subscriptions
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', data.userId)
    .eq('status', 'active');

  const { data: row, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: data.userId,
      plan_name: data.planName,
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: data.endDate || null,
      payment_provider: data.paymentProvider || null,
      trial_minutes_limit: data.totalMinutes ?? null,
      trial_minutes_used: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create subscription: ${error.message}`);

  // Update user's subscription_type
  const subsType = data.planId || data.planName.toLowerCase().replace(/ /g, '_');
  await supabaseAdmin
    .from('users')
    .update({ subscription_type: subsType })
    .eq('id', data.userId);

  return row as Subscription;
}

// ─── Settings operations ──────────────────────────────────────────────────────

export async function getSettings(userId: string): Promise<Settings | undefined> {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data as Settings | undefined;
}

export async function upsertSettings(data: {
  userId: string;
  preferredLanguage?: string;
  notificationsEnabled?: boolean;
}): Promise<Settings> {
  const existing = await getSettings(data.userId);

  if (existing) {
    const updates: Record<string, any> = {};
    if (data.preferredLanguage !== undefined) updates.preferred_language = data.preferredLanguage;
    if (data.notificationsEnabled !== undefined) updates.notifications_enabled = data.notificationsEnabled;

    const { data: row, error } = await supabaseAdmin
      .from('settings')
      .update(updates)
      .eq('user_id', data.userId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update settings: ${error.message}`);
    return row as Settings;
  }

  const { data: row, error } = await supabaseAdmin
    .from('settings')
    .insert({
      user_id: data.userId,
      preferred_language: data.preferredLanguage || 'ar',
      notifications_enabled: data.notificationsEnabled !== false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert settings: ${error.message}`);
  return row as Settings;
}

console.log('[Supabase] Database layer initialized');
