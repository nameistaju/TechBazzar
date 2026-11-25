// server/validators/adminSchemas.js
import { z } from 'zod';

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(50000).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional()
}).passthrough();

export const adminProductsQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['created_at_desc', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc', 'name_asc']).optional(),
  status: z.enum(['all', 'active', 'draft', 'archived']).optional(),
  stockLevel: z.enum(['all', 'out', 'low', 'in']).optional()
}).passthrough();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(10, 'New password must be at least 10 characters long').max(128)
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email()
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  price: z.coerce.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required').max(80)
}).passthrough();

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().min(0).optional()
}).passthrough();

export const mergeProductsSchema = z.object({
  canonicalId: z.string().min(1),
  duplicateIds: z.array(z.string().min(1)).min(1).max(50)
});

export const bulkProductsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(['set_status', 'set_category', 'adjust_price_percent', 'adjust_price_amount', 'mark_flag', 'delete']),
  value: z.any().optional()
});

export const adjustInventorySchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['add', 'subtract', 'set']).default('set'),
  quantity: z.coerce.number().int().min(0),
  reason: z.string().min(1).max(100),
  notes: z.string().max(500).optional().nullable(),
  referenceId: z.string().max(100).optional().nullable()
});

export const updateOrderSchema = z.object({
  status: z.enum(['Placed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled', 'confirmed']).optional(),
  note: z.string().max(500).optional(),
  courierName: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  internalNotes: z.string().max(1000).optional(),
  paymentStatus: z.enum(['Paid', 'Unpaid', 'Partially Paid', 'paid', 'unpaid', 'partially_paid', 'credit_issued']).optional()
});

export const manualOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(20).optional()
  }).passthrough(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().int().positive()
  })).min(1),
  paymentMethod: z.string().max(40).optional(),
  internalNotes: z.string().max(1000).optional(),
  shippingAddress: z.any().optional()
});

export const discountSchema = z.object({
  title: z.string().min(1).max(150),
  type: z.enum(['percentage', 'flat', 'rule_higher', 'rule_lower']),
  code: z.string().max(50).optional().nullable(),
  value: z.coerce.number().nonnegative().optional()
}).passthrough();

export const discountUpdateSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  type: z.enum(['percentage', 'flat', 'rule_higher', 'rule_lower']).optional()
}).passthrough();

export const simulateDiscountSchema = z.object({
  discountId: z.coerce.number().int().positive().optional().nullable(),
  code: z.string().max(50).optional().nullable(),
  cartItems: z.array(z.any()).optional()
});

export const documentCreateSchema = z.object({
  customer: z.object({ name: z.string().min(1) }).passthrough(),
  items: z.array(z.object({
    quantity: z.coerce.number().positive(),
    rate: z.coerce.number().nonnegative()
  }).passthrough()).min(1)
}).passthrough();

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.string().max(50).optional(),
  paymentDate: z.string().max(30).optional(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

export const voidInvoiceSchema = z.object({
  voidReason: z.string().min(2, 'Void reason is required').max(500)
});

export const customerCreateSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email()
}).passthrough();

export const customerMergeSchema = z.object({
  primaryId: z.coerce.number().int().positive(),
  secondaryId: z.coerce.number().int().positive()
});

export const bannerCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slot: z.string().min(1).max(60)
}).passthrough();

export const bannerUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional()
}).passthrough();

export const bannerReorderSchema = z.object({
  bannerIds: z.array(z.coerce.number().int().positive()).min(1).max(100)
});

export const bannerUploadSchema = z.object({
  base64: z.string().optional(),
  imageBase64: z.string().optional(),
  image: z.string().optional(),
  type: z.string().max(30).optional(),
  deviceType: z.string().max(30).optional()
}).passthrough();

export const quoteUpdateSchema = z.object({
  status: z.enum(['Pending', 'Reviewed', 'Quoted', 'Accepted', 'Rejected']).optional(),
  notes: z.string().max(2000).optional().nullable()
});
