import { z } from 'zod';

export enum FulfillmentType {
  HOT_NOW = 'HOT_NOW',
  SCHEDULED = 'SCHEDULED',
}

export enum OptionSelectType {
  SINGLE = 'SINGLE',
  MULTI = 'MULTI',
  QTY = 'QTY',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  SCHEDULED = 'SCHEDULED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  COD = 'COD',
  JAZZCASH = 'JAZZCASH',
  EASYPAISA = 'EASYPAISA',
  STRIPE = 'STRIPE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  INITIATED = 'INITIATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum DiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export const fulfillmentLabel: Record<FulfillmentType, string> = {
  [FulfillmentType.HOT_NOW]: 'Hot & Fast',
  [FulfillmentType.SCHEDULED]: 'Scheduled delivery',
};

export const browsingModeFromFulfillment = (type: FulfillmentType) =>
  type === FulfillmentType.HOT_NOW ? 'order-now' : 'stock-freezer';

export const categorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional().nullable(),
  image: z.string().url().optional().nullable().or(z.literal('')),
  fulfillmentType: z.nativeEnum(FulfillmentType),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  parentId: z.string().cuid().optional().nullable(),
});

export const productSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000).optional().nullable(),
  image: z.string().optional().nullable(),
  pricePkr: z.number().int().min(0),
  compareAtPkr: z.number().int().min(0).optional().nullable(),
  categoryId: z.string().cuid(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  packSize: z.string().max(80).optional().nullable(),
  weightGrams: z.number().int().min(0).optional().nullable(),
  piecesPerPack: z.number().int().min(0).optional().nullable(),
  optionGroupIds: z.array(z.string().cuid()).optional(),
});

export const optionValueSchema = z.object({
  label: z.string().min(1).max(120),
  priceDeltaPkr: z.number().int().default(0),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const optionGroupSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  selectType: z.nativeEnum(OptionSelectType),
  required: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(0).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  values: z.array(optionValueSchema).min(1),
});

export const cartItemSelectionSchema = z.object({
  optionGroupId: z.string(),
  optionValueId: z.string(),
  quantity: z.number().int().min(1).default(1),
});

export const addCartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99).default(1),
  selections: z.array(cartItemSelectionSchema).default([]),
  notes: z.string().max(500).optional(),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(10).max(20),
  customerEmail: z.string().email().optional().nullable(),
  addressLine: z.string().min(5).max(300),
  deliveryZoneId: z.string().cuid(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  promoCode: z.string().max(40).optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const deliveryZoneSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(140),
  feePkr: z.number().int().min(0),
  etaMinutesMin: z.number().int().min(0).default(30),
  etaMinutesMax: z.number().int().min(0).default(60),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const promoSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(1).max(120),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().int().min(1),
  minOrderPkr: z.number().int().min(0).default(0),
  categoryId: z.string().cuid().optional().nullable(),
  productId: z.string().cuid().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().cuid(),
      displayOrder: z.number().int().min(0),
    }),
  ),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type OptionGroupInput = z.infer<typeof optionGroupSchema>;
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;
export type PromoInput = z.infer<typeof promoSchema>;
