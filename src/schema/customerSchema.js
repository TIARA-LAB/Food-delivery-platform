import { z } from 'zod';

export const CustomerSchemas = {
  register: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name is required').max(100),
    phone: z.string().optional()
  }),

  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  }),

  addToCart: z.object({
    foodId: z.string(), 
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(99)
  }),

  createOrder: z.object({
    restaurantId: z.string(),     
    addressId: z.string(),        
    paymentMethod: z.enum(['CARD', 'TRANSFER', 'CASH']),
    notes: z.string().max(500).optional()  // ✅ FIXED: max BEFORE optional
  }),

  restaurantQuery: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10),
    city: z.string().optional(),
    cuisine: z.string().optional(),
    rating: z.coerce.number().min(1).max(5).optional()
  })
};
