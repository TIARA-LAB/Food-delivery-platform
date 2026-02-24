import { z } from 'zod';

const paginationShape = {
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10)
};

export const createSuperAdminSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100)
  })
});

export const createAdminSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    role: z.enum(['ADMIN', 'SUPER_ADMIN'])
  })
});

// BACKWARD COMPATIBILITY
export { createAdminSchema as createUserSchema };

export const getUsersSchema = z.object({
  query: z.object({
    ...paginationShape,
    role: z.enum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'VENDOR', 'RIDER']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    isPending: z.enum(['true', 'false']).optional()
  })
});

export const updateUserRoleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    role: z.enum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'VENDOR', 'RIDER'])
  })
});

export const getVendorsSchema = z.object({
  query: z.object({
    ...paginationShape,
    city: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional()
  })
});

export const approveVendorSchema = z.object({
  params: z.object({ id: z.string().uuid() })
});

export const getCustomersSchema = z.object({
  query: z.object({
    ...paginationShape,
    isActive: z.enum(['true', 'false']).optional(),
    isPending: z.enum(['true', 'false']).optional()
  })
});

export const getOrdersSchema = z.object({
  query: z.object({
    ...paginationShape,
    status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED']).optional(),
    userId: z.string().uuid().optional(),
    restaurantId: z.string().uuid().optional()
  })
});

export const analyticsSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })
});

export const getReviewsSchema = z.object({
  query: z.object({
    ...paginationShape,
    restaurantId: z.string().uuid().optional()
  })
});
