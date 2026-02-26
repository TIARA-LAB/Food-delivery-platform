import { z } from 'zod';

const baseProductFields = {
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must not exceed 255 characters"),
  
  description: z.string()
    .max(1000, "Description too long")
    .optional()
    .transform(val => val?.trim() || null),
  
  price: z.coerce.number()
    .positive("Price must be positive")
    .max(10000, "Price too high"),
  
  originalPrice: z.coerce.number()
    .positive()
    .optional()
    .transform(val => val || null),
  
  image: z.string()
    .url("Invalid image URL")
    .max(500)
    .optional()
    .transform(val => val || null),
  
  images: z.array(z.string().url())
    .optional()
    .transform(val => val || null),
  
  isActive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  stockQuantity: z.coerce.number().int().min(0).default(9999),
  prepTimeMinutes: z.coerce.number().int().min(1).max(120).default(15),
  position: z.coerce.number().int().min(0).default(0)
};

export const schemas = {
  create: z.object({
    ...baseProductFields,
    restaurantId: z.string().uuid("Valid restaurant ID required")
  }),

  update: z.object(baseProductFields).partial(),

  discount: z.object({
    discountPercent: z.coerce.number()
      .min(0, "Discount must be 0-100")
      .max(100, "Discount must be 0-100"),
    discountExpiry: z.string()
      .datetime("Invalid ISO datetime")
      .optional()
      .transform(val => val ? new Date(val) : null)
  })
};

export const validateRequest = (schemaKey) => {
  return (req, res, next) => {
    const schema = schemas[schemaKey];
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          value: issue.received,
          code: issue.code
        }))
      });
    }

    req.validatedData = result.data;
    next();
  };
};
