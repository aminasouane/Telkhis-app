import * as db from "../db";
import { supabaseAdmin } from "../supabase-admin";
import { getPlanById } from "../../shared/plans";

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number; // e.g. 20 for 20%
  validForRegistration: boolean; // Valid for first-time paid subscribers
  validForRenewal: boolean; // Valid for existing/past paid subscribers renewing
  isActive: boolean;
  maxUses: number | null; // null means unlimited
  timesUsed: number;
  expiresAt: string | null; // ISO date string or null
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string;
  userEmail?: string;
  planId: string;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  usageType: "registration" | "renewal";
  usedAt: string;
}

const SETTINGS_KEY_COUPONS = "COUPONS";
const SETTINGS_KEY_COUPON_USAGES = "COUPON_USAGES";

/**
 * Fetch all coupons from storage (stored in system_settings)
 */
export async function getAllCoupons(): Promise<Coupon[]> {
  try {
    const settings = await db.getSystemSettings();
    const coupons: Coupon[] = settings[SETTINGS_KEY_COUPONS] || [];
    return coupons;
  } catch (error) {
    console.error("[Coupons] Error fetching coupons:", error);
    return [];
  }
}

/**
 * Find coupon by case-insensitive code
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();
  const coupons = await getAllCoupons();
  const found = coupons.find(c => c.code.toUpperCase() === normalized);
  return found || null;
}

/**
 * Find coupon by ID
 */
export async function getCouponById(id: string): Promise<Coupon | null> {
  const coupons = await getAllCoupons();
  return coupons.find(c => c.id === id) || null;
}

/**
 * Save or update coupon list in database
 */
async function saveCouponsList(coupons: Coupon[]): Promise<boolean> {
  return await db.updateSystemSetting(
    SETTINGS_KEY_COUPONS,
    coupons,
    "List of discount coupons"
  );
}

/**
 * Create a new coupon
 */
export async function createCoupon(data: {
  code: string;
  discountPercent: number;
  validForRegistration?: boolean;
  validForRenewal?: boolean;
  isActive?: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
  description?: string;
}): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
  const normalizedCode = data.code.trim().toUpperCase();

  if (!normalizedCode) {
    return { success: false, error: "رمز الكوبون مطلوب" };
  }

  if (isNaN(data.discountPercent) || data.discountPercent <= 0 || data.discountPercent > 100) {
    return { success: false, error: "نسبة الخصم يجب أن تكون بين 1% و 100%" };
  }

  const existingCoupons = await getAllCoupons();
  if (existingCoupons.some(c => c.code.toUpperCase() === normalizedCode)) {
    return { success: false, error: "رمز الكوبون موجود مسبقاً، يرجى اختيار رمز آخر" };
  }

  const now = new Date().toISOString();
  const newCoupon: Coupon = {
    id: `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    code: normalizedCode,
    discountPercent: Math.round(data.discountPercent),
    validForRegistration: data.validForRegistration !== false,
    validForRenewal: data.validForRenewal !== false,
    isActive: data.isActive !== false,
    maxUses: data.maxUses !== undefined && data.maxUses !== null ? Math.max(1, Number(data.maxUses)) : null,
    timesUsed: 0,
    expiresAt: data.expiresAt || null,
    description: data.description?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };

  existingCoupons.unshift(newCoupon);
  const ok = await saveCouponsList(existingCoupons);
  if (!ok) {
    return { success: false, error: "فشل حفظ الكوبون في قاعدة البيانات" };
  }

  return { success: true, coupon: newCoupon };
}

/**
 * Update an existing coupon
 */
export async function updateCoupon(
  id: string,
  updates: Partial<Omit<Coupon, "id" | "createdAt">>
): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
  const coupons = await getAllCoupons();
  const index = coupons.findIndex(c => c.id === id);

  if (index === -1) {
    return { success: false, error: "الكوبون غير موجود" };
  }

  const current = coupons[index];

  // If code is being updated, verify uniqueness
  if (updates.code) {
    const normalized = updates.code.trim().toUpperCase();
    const duplicate = coupons.find(c => c.id !== id && c.code.toUpperCase() === normalized);
    if (duplicate) {
      return { success: false, error: "رمز الكوبون مستخدم بالفعل في كوبون آخر" };
    }
    current.code = normalized;
  }

  if (updates.discountPercent !== undefined) {
    const pct = Math.round(Number(updates.discountPercent));
    if (pct <= 0 || pct > 100) {
      return { success: false, error: "نسبة الخصم يجب أن تكون بين 1% و 100%" };
    }
    current.discountPercent = pct;
  }

  if (updates.validForRegistration !== undefined) {
    current.validForRegistration = Boolean(updates.validForRegistration);
  }

  if (updates.validForRenewal !== undefined) {
    current.validForRenewal = Boolean(updates.validForRenewal);
  }

  if (updates.isActive !== undefined) {
    current.isActive = Boolean(updates.isActive);
  }

  if (updates.maxUses !== undefined) {
    current.maxUses = updates.maxUses !== null ? Math.max(1, Number(updates.maxUses)) : null;
  }

  if (updates.expiresAt !== undefined) {
    current.expiresAt = updates.expiresAt || null;
  }

  if (updates.description !== undefined) {
    current.description = updates.description?.trim() || "";
  }

  current.updatedAt = new Date().toISOString();
  coupons[index] = current;

  const ok = await saveCouponsList(coupons);
  if (!ok) {
    return { success: false, error: "فشل حفظ تعديلات الكوبون" };
  }

  return { success: true, coupon: current };
}

/**
 * Delete a coupon by ID
 */
export async function deleteCoupon(id: string): Promise<{ success: boolean; error?: string }> {
  const coupons = await getAllCoupons();
  const filtered = coupons.filter(c => c.id !== id);

  if (filtered.length === coupons.length) {
    return { success: false, error: "الكوبون غير موجود" };
  }

  const ok = await saveCouponsList(filtered);
  if (!ok) {
    return { success: false, error: "فشل حذف الكوبون" };
  }

  return { success: true };
}

/**
 * Check if a given user is renewing or registering for the first time
 */
export async function isUserRenewal(userId: string): Promise<boolean> {
  try {
    const { data: subs, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan_name, status")
      .eq("user_id", userId);

    if (error || !subs || subs.length === 0) {
      return false;
    }

    // If user has had any non-trial subscription, they are renewing
    const hadPaidPlan = subs.some(s => s.plan_name !== "trial");
    return hadPaidPlan;
  } catch (err) {
    console.error("[Coupons] Error checking renewal status:", err);
    return false;
  }
}

export interface CouponValidationResult {
  valid: boolean;
  message?: string;
  coupon?: Coupon;
  planId?: string;
  originalPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  finalPrice?: number;
  isRenewal?: boolean;
}

/**
 * Validate a coupon code for a given user and plan
 */
export async function validateCoupon(
  code: string,
  userId: string,
  planId: "basic" = "basic"
): Promise<CouponValidationResult> {
  const plan = getPlanById(planId);
  if (!plan) {
    return { valid: false, message: "خطة الاشتراك غير صالحة" };
  }

  const coupon = await getCouponByCode(code);
  if (!coupon) {
    return { valid: false, message: "كود الخصم غير صحيح أو غير موجود" };
  }

  if (!coupon.isActive) {
    return { valid: false, message: "هذا الكوبون معطّل حالياً" };
  }

  // Check expiration date
  if (coupon.expiresAt) {
    const expiry = new Date(coupon.expiresAt).getTime();
    if (Date.now() > expiry) {
      return { valid: false, message: "انتهت صلاحية هذا الكوبون" };
    }
  }

  // Check usage limit
  if (coupon.maxUses !== null && coupon.timesUsed >= coupon.maxUses) {
    return { valid: false, message: "لقد تم استنفاد الحد الأقصى لاستخدام هذا الكوبون" };
  }

  // Check registration vs renewal
  const isRenewal = await isUserRenewal(userId);

  if (!isRenewal && !coupon.validForRegistration) {
    return {
      valid: false,
      message: "هذا الكوبون مخصص فقط لتجديد الاشتراك، ولا يمكن استخدامه للتسجيل الجديد",
      isRenewal,
    };
  }

  if (isRenewal && !coupon.validForRenewal) {
    return {
      valid: false,
      message: "هذا الكوبون مخصص فقط للمشتركين الجدد، ولا يمكن استخدامه عند التجديد",
      isRenewal,
    };
  }

  // Calculate discount
  const originalPrice = plan.priceDZD; // 1500 DZD
  const discountAmount = Math.round((originalPrice * coupon.discountPercent) / 100);
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    valid: true,
    coupon,
    planId,
    originalPrice,
    discountPercent: coupon.discountPercent,
    discountAmount,
    finalPrice,
    isRenewal,
    message: `تم تطبيق خصم ${coupon.discountPercent}% بنجاح!`,
  };
}

/**
 * Get all coupon usage records
 */
export async function getCouponUsages(): Promise<CouponUsage[]> {
  try {
    const settings = await db.getSystemSettings();
    return settings[SETTINGS_KEY_COUPON_USAGES] || [];
  } catch (error) {
    console.error("[Coupons] Error fetching usages:", error);
    return [];
  }
}

/**
 * Record a coupon usage upon successful payment / activation
 */
export async function recordCouponUsage(data: {
  couponId: string;
  couponCode: string;
  userId: string;
  userEmail?: string;
  planId: string;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  usageType: "registration" | "renewal";
}): Promise<void> {
  try {
    // 1. Increment coupon timesUsed counter
    const coupons = await getAllCoupons();
    const couponIndex = coupons.findIndex(c => c.id === data.couponId || c.code.toUpperCase() === data.couponCode.toUpperCase());
    if (couponIndex !== -1) {
      coupons[couponIndex].timesUsed = (coupons[couponIndex].timesUsed || 0) + 1;
      coupons[couponIndex].updatedAt = new Date().toISOString();
      await saveCouponsList(coupons);
    }

    // 2. Append to usage logs
    const usages = await getCouponUsages();
    const newUsage: CouponUsage = {
      id: `usg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      couponId: data.couponId,
      couponCode: data.couponCode.toUpperCase(),
      userId: data.userId,
      userEmail: data.userEmail,
      planId: data.planId,
      originalPrice: data.originalPrice,
      discountPercent: data.discountPercent,
      discountAmount: data.discountAmount,
      finalPrice: data.finalPrice,
      usageType: data.usageType,
      usedAt: new Date().toISOString(),
    };

    usages.unshift(newUsage);
    // Keep last 1000 usages to prevent excessive document size
    const trimmed = usages.slice(0, 1000);
    await db.updateSystemSetting(SETTINGS_KEY_COUPON_USAGES, trimmed, "Coupon usage history");

    console.log(`[Coupons] ✅ Recorded coupon usage: ${data.couponCode} for user ${data.userId} (-${data.discountAmount} DZD)`);
  } catch (error) {
    console.error("[Coupons] Failed to record coupon usage:", error);
  }
}
