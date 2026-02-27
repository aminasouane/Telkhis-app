import { z } from "zod";

/**
 * Subscription Plans Configuration for Chargily Pay Integration
 * 
 * خطط الاشتراك المدعومة في تطبيق تلخيصلي
 */

export type PlanId = "basic" | "student" | "professional";

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number; // Price in USD
  priceDZD: number; // Price in DZD (Algerian Dinar)
  currency: "USD" | "DZD";

  // Limits
  lectures: number; // Number of lectures allowed
  lecturesDuration: number; // Duration per lecture in minutes
  totalMinutes: number; // Total minutes = lectures * lecturesDuration

  // Features
  features: string[];
  featuresAr: string[];

  // Display
  popular?: boolean;
  badge?: string;
  badgeAr?: string;

  // Chargily IDs (will be set when creating products/prices in Chargily)
  chargilyProductId?: string;
  chargilyPriceId?: string;
}

/**
 * تعريف الخطط الثلاث حسب المتطلبات
 * 
 * Note: Chargily Pay currently only supports DZD currency
 * Prices will need to be converted from USD to DZD
 * Current rate: ~$1 = ~135 DZD (may vary)
 */
export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  basic: {
    id: "basic",
    name: "Basic Plan",
    nameAr: "الخطة الأساسية",
    description: "Perfect for trying out the service after the free trial",
    descriptionAr: "مثالية لتجربة الخدمة بعد النسخة المجانية",
    price: 4.99,
    priceDZD: 1200, // الأساسية على موقع Chargily
    currency: "DZD",
    lectures: 5,
    lecturesDuration: 45,
    totalMinutes: 225, // 5 × 45 = 225 minutes
    features: [
      "Transcribe & summarize 5 lectures",
      "45 minutes per lecture",
      "Support for Arabic, French, and Algerian dialect",
      "PDF & TXT export",
      "Email support",
    ],
    featuresAr: [
      "تلخيص 5 محاضرات",
      "مدة كل محاضرة 45 دقيقة",
      "دعم العربية، الفرنسية، واللهجة الجزائرية",
      "تصدير PDF و TXT",
      "دعم عبر البريد الإلكتروني",
    ],
    badge: "Starter",
    badgeAr: "للمبتدئين",
  },

  student: {
    id: "student",
    name: "Student Plan",
    nameAr: "خطة الطالب",
    description: "Most popular plan for university students",
    descriptionAr: "الخطة الأكثر طلباً للطلاب الجامعيين",
    price: 19.00,
    priceDZD: 4700, // الطلابية على موقع Chargily
    currency: "DZD",
    lectures: 30,
    lecturesDuration: 45,
    totalMinutes: 1350, // 30 × 45 = 1350 minutes
    features: [
      "Transcribe & summarize 30 lectures",
      "45 minutes per lecture",
      "All features from Basic Plan",
      "Priority processing",
      "Save full history",
      "Priority email support",
    ],
    featuresAr: [
      "تلخيص 30 محاضرة",
      "مدة كل محاضرة 45 دقيقة",
      "جميع مميزات الخطة الأساسية",
      "أولوية في المعالجة",
      "حفظ التاريخ الكامل",
      "دعم ذو أولوية عبر البريد",
    ],
    popular: true,
    badge: "Most Popular",
    badgeAr: "الأكثر طلباً",
  },

  professional: {
    id: "professional",
    name: "Professional Plan",
    nameAr: "خطة المحترف",
    description: "For teachers, researchers, and heavy users",
    descriptionAr: "للأساتذة، الباحثين، وأصحاب الاستخدام المكثف",
    price: 34.99,
    priceDZD: 9000, // Professional - يُحدَّد لاحقاً
    currency: "DZD",
    lectures: 60,
    lecturesDuration: 45,
    totalMinutes: 2700, // 60 × 45 = 2700 minutes
    features: [
      "Transcribe & summarize 60 lectures",
      "45 minutes per lecture",
      "All features from Student Plan",
      "Highest priority processing",
      "Advanced export options",
      "Dedicated support",
      "Early access to new features",
    ],
    featuresAr: [
      "تلخيص 60 محاضرة",
      "مدة كل محاضرة 45 دقيقة",
      "جميع مميزات خطة الطالب",
      "أعلى أولوية في المعالجة",
      "خيارات تصدير متقدمة",
      "دعم مخصص",
      "وصول مبكر للميزات الجديدة",
    ],
    badge: "Best Value",
    badgeAr: "الأفضل قيمة",
  },
};

/**
 * Helper function to get plan by ID
 */
export function getPlanById(planId: PlanId): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId] || null;
}

/**
 * Helper function to get all plans as array
 */
export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

/**
 * Zod schema for plan selection
 */
export const planSelectionSchema = z.object({
  planId: z.enum(["basic", "student", "professional"]),
});

export type PlanSelection = z.infer<typeof planSelectionSchema>;

/**
 * Chargily checkout creation schema
 */
export const chargilyCheckoutSchema = z.object({
  planId: z.enum(["basic", "student", "professional"]),
  userId: z.string().uuid(),
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  locale: z.enum(["ar", "en", "fr"]).default("ar"),
});

export type ChargilyCheckoutData = z.infer<typeof chargilyCheckoutSchema>;

/**
 * Payment status types
 */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

/**
 * Subscription status types
 */
export type SubscriptionStatus = "active" | "expired" | "cancelled";
