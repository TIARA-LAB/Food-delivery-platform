import { z } from 'zod';
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password required')
  })
});

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID'),  // ← FIXED: productId
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Max 100 items')
  })
});

export const getCartSchema = z.object({});

// Order Schemas
export const createOrderSchema = z.object({
  body: z.object({
    restaurantId: z.string().uuid('Invalid restaurant ID'),
    addressId: z.string().uuid('Invalid address ID'),
    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).optional().default('CASH')
  })
});

// Restaurant Query - FIXED SYNTAX
export const restaurantQuery = z.object({
  query: z.object({
    page: z.string().optional().transform(val => Number(val) || 1),
    limit: z.string().optional().transform(val => Math.min(50, Math.max(1, Number(val) || 10))),
    city: z.string().optional(),
    search: z.string().optional(),
    cuisine: z.string().optional(),
    rating: z.string().optional().transform(val => Number(val) || undefined)
  }).optional()
});

export const restaurantMenuSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid restaurant ID')
  })
});

export const getOrdersQuery = z.object({
  query: z.object({
    page: z.string().optional().transform(val => Number(val) || 1),
    limit: z.string().optional().transform(val => Math.min(50, Math.max(1, Number(val) || 10)))
  }).optional()
});

// Export all schemas
export const customerSchemas = {
  register: registerSchema,
  login: loginSchema,
  addToCart: addToCartSchema,
  createOrder: createOrderSchema,
  restaurantQuery,
  restaurantMenu: restaurantMenuSchema,
  getOrders: getOrdersQuery
};
