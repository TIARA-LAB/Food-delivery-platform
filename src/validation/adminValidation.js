import { z } from 'zod';

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10)
  })
});

// Users
export const getUsersSchema = paginationSchema.extend({
  query: z.object({
    role: z.enum(['CUSTOMER', 'VENDOR', 'RIDER', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional()
  })
});

export const updateUserRoleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    role: z.enum(['CUSTOMER', 'ADMIN', 'VENDOR', 'RIDER'])
  })
});

// Vendors  
export const getVendorsSchema = paginationSchema.extend({
  query: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional()
  })
});

export const approveVendorSchema = z.object({
  params: z.object({ id: z.string().uuid() })
});

// Customers
export const getCustomersSchema = paginationSchema.extend({
  query: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional()
  })
});

// Analytics
export const analyticsSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })
});

// Reviews
export const reviewSchema = paginationSchema.extend({
  query: z.object({
    vendorId: z.string().uuid().optional(),
    status: z.enum(['APPROVED', 'PENDING', 'REJECTED']).optional()
  })
});
