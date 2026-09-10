import type { Request, Response } from "express";
import { z } from "zod";
import * as couponService from "../services/coupons";

const validateSchema = z.object({
  code: z.string().min(1, "رمز الكوبون مطلوب"),
  planId: z.enum(["basic"]).default("basic"),
});

const createCouponSchema = z.object({
  code: z.string().min(1, "رمز الكوبون مطلوب"),
  discountPercent: z.number().min(1).max(100),
  validForRegistration: z.boolean().optional().default(true),
  validForRenewal: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  maxUses: z.number().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  description: z.string().optional(),
});

const updateCouponSchema = z.object({
  code: z.string().min(1).optional(),
  discountPercent: z.number().min(1).max(100).optional(),
  validForRegistration: z.boolean().optional(),
  validForRenewal: z.boolean().optional(),
  isActive: z.boolean().optional(),
  maxUses: z.number().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  description: z.string().optional(),
});

/**
 * POST /api/coupons/validate
 * Validate coupon for the authenticated user and return calculated discount
 */
export async function handleValidateCoupon(req: Request, res: Response) {
  try {
    const userId = req.authenticatedUserId;
    if (!userId) {
      return res.status(401).json({ valid: false, message: "يجب تسجيل الدخول لاستخدام الكوبون" });
    }

    const validation = validateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        valid: false,
        message: validation.error.errors[0]?.message || "بيانات غير صالحة",
      });
    }

    const { code, planId } = validation.data;
    const result = await couponService.validateCoupon(code, userId, planId);

    if (!result.valid) {
      return res.status(200).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[API] Error validating coupon:", error);
    return res.status(500).json({
      valid: false,
      message: error.message || "حدث خطأ أثناء فحص الكوبون",
    });
  }
}

/**
 * GET /api/admin/coupons
 * List all coupons (Admin only)
 */
export async function handleGetAdminCoupons(_req: Request, res: Response) {
  try {
    const coupons = await couponService.getAllCoupons();
    return res.json({ coupons });
  } catch (error: any) {
    console.error("[API] Error fetching admin coupons:", error);
    return res.status(500).json({ error: "فشل جلب قائمة الكوبونات" });
  }
}

/**
 * POST /api/admin/coupons
 * Create a new coupon (Admin only)
 */
export async function handleCreateAdminCoupon(req: Request, res: Response) {
  try {
    const validation = createCouponSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0]?.message || "بيانات الكوبون غير صالحة",
      });
    }

    const result = await couponService.createCoupon(validation.data);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({ success: true, coupon: result.coupon });
  } catch (error: any) {
    console.error("[API] Error creating admin coupon:", error);
    return res.status(500).json({ error: "فشل إنشاء الكوبون" });
  }
}

/**
 * PATCH /api/admin/coupons/:id
 * Update coupon fields or toggle status (Admin only)
 */
export async function handleUpdateAdminCoupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "معرّف الكوبون مطلوب" });

    const validation = updateCouponSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0]?.message || "بيانات التعديل غير صالحة",
      });
    }

    const result = await couponService.updateCoupon(id, validation.data);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, coupon: result.coupon });
  } catch (error: any) {
    console.error("[API] Error updating admin coupon:", error);
    return res.status(500).json({ error: "فشل تعديل الكوبون" });
  }
}

/**
 * DELETE /api/admin/coupons/:id
 * Delete coupon (Admin only)
 */
export async function handleDeleteAdminCoupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "معرّف الكوبون مطلوب" });

    const result = await couponService.deleteCoupon(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, message: "تم حذف الكوبون بنجاح" });
  } catch (error: any) {
    console.error("[API] Error deleting admin coupon:", error);
    return res.status(500).json({ error: "فشل حذف الكوبون" });
  }
}

/**
 * GET /api/admin/coupons/usages
 * Get coupon usage history (Admin only)
 */
export async function handleGetAdminCouponUsages(_req: Request, res: Response) {
  try {
    const usages = await couponService.getCouponUsages();
    return res.json({ usages });
  } catch (error: any) {
    console.error("[API] Error fetching coupon usages:", error);
    return res.status(500).json({ error: "فشل جلب سجل استخدام الكوبونات" });
  }
}
