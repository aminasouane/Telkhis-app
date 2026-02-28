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

// ─── System Settings ──────────────────────────────────────────────────────────

export async function getSystemSettings(): Promise<Record<string, any>> {
  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('key, value');
  if (error) {
    console.error("Error fetching system settings:", error);
    return {};
  }
  const settings: Record<string, any> = {};
  data?.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

export async function updateSystemSetting(key: string, value: any, description?: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert({
      key,
      value,
      description,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  if (error) {
    console.error("Error updating system setting:", error);
    return false;
  }
  return true;
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
  theme?: string;
}): Promise<Settings> {
  const existing = await getSettings(data.userId);

  if (existing) {
    const updates: Record<string, any> = {};
    if (data.preferredLanguage !== undefined) updates.preferred_language = data.preferredLanguage;
    if (data.notificationsEnabled !== undefined) updates.notifications_enabled = data.notificationsEnabled;
    if (data.theme !== undefined) updates.theme = data.theme;

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
      theme: data.theme || 'light',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert settings: ${error.message}`);
  return row as Settings;
}

// ─── Admin operations ─────────────────────────────────────────────────────────

export async function getUserRole(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role || 'user';
}

export async function updateUserProfile(userId: string, updates: { name?: string }): Promise<User> {
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) updateData.name = updates.name;

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return data as User;
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  // Delete in order: usage → summaries → settings → subscriptions → payments → user
  await supabaseAdmin.from('usage').delete().eq('user_id', userId);
  await supabaseAdmin.from('summaries').delete().eq('user_id', userId);
  await supabaseAdmin.from('settings').delete().eq('user_id', userId);
  await supabaseAdmin.from('payments').delete().eq('user_id', userId);
  await supabaseAdmin.from('subscriptions').delete().eq('user_id', userId);
  const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);

  // Also delete from auth.users
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (e) {
    console.error('[DB] Failed to delete auth user (may already be deleted):', e);
  }
  return true;
}

export async function getAdminStats(): Promise<{
  totalUsers: number;
  paidUsers: number;
  trialUsers: number;
  totalSummaries: number;
  summariesToday: number;
  totalPayments: number;
  revenueTotal: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const [usersRes, paidSubsRes, summariesRes, todaySummariesRes, paymentsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true })
      .neq('plan_name', 'trial').eq('status', 'active'),
    supabaseAdmin.from('summaries').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('summaries').select('id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`),
    supabaseAdmin.from('payments').select('amount').eq('status', 'paid'),
  ]);

  const totalUsers = usersRes.count || 0;
  const paidUsers = paidSubsRes.count || 0;
  const totalSummaries = summariesRes.count || 0;
  const summariesToday = todaySummariesRes.count || 0;
  const revenueTotal = (paymentsRes.data || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  return {
    totalUsers,
    paidUsers,
    trialUsers: totalUsers - paidUsers,
    totalSummaries,
    summariesToday,
    totalPayments: (paymentsRes.data || []).length,
    revenueTotal,
  };
}

export async function getAllUsersWithStats(params?: {
  search?: string;
  planFilter?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: any[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('users')
    .select('*, subscriptions!subscriptions_user_id_fkey(plan_name, status, trial_minutes_used, trial_minutes_limit, start_date, end_date)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params?.search) {
    query = query.or(`email.ilike.%${params.search}%,name.ilike.%${params.search}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`Failed to get users: ${error.message}`);

  // If plan filter, filter in JS after join (Supabase doesn't support nested filters well)
  let users = data || [];
  if (params?.planFilter && params.planFilter !== 'all') {
    users = users.filter((u: any) => {
      const activeSub = (u.subscriptions || []).find((s: any) => s.status === 'active');
      return activeSub?.plan_name === params.planFilter;
    });
  }

  return { users, total: count || 0 };
}

export async function getUserDetailForAdmin(userId: string): Promise<any> {
  const [user, subs, summaries, usage] = await Promise.all([
    supabaseAdmin.from('users').select('*').eq('id', userId).single(),
    supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabaseAdmin.from('summaries').select('id, title, language, audio_duration, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('usage').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(30),
  ]);

  return {
    user: user.data,
    subscriptions: subs.data || [],
    summaries: summaries.data || [],
    usage: usage.data || [],
  };
}

console.log('[Supabase] Database layer initialized');
