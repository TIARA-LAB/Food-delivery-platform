import { z } from 'zod';

export const schemas = {
  create: z.object({
    name: z.string().min(3).max(255),
    description: z.string().max(1000).optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    discountPercent: z.number().min(0).max(100).optional().default(0),
    discountExpiry: z.string().optional(),
    image: z.string().url().optional(),
    images: z.array(z.string().url()).optional(),
    stockQuantity: z.number().int().min(0).max(9999).default(9999),
    prepTimeMinutes: z.number().int().min(1).max(120).default(15),
    
  }),

  update: z.object({
    name: z.string().min(3).max(255).optional(),
    description: z.string().max(1000).optional(),
    price: z.number().positive().optional(),
    originalPrice: z.number().positive().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    discountExpiry: z.string().optional(),
    isActive: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    stockQuantity: z.number().int().min(0).max(9999).optional()
  }),

  discount: z.object({
    discountPercent: z.number().min(1).max(90),  // 1-90%
    discountExpiry: z.string().datetime().optional()
  })
};

export const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ 
      status: 'fail',
      message: 'Validation failed',
      errors: error.errors.map(e => ({ 
        field: e.path.join('.'), 
        message: e.message 
      }))
    });
  }
};
