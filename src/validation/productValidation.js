
import { z } from 'zod';


const baseProductFields = {
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must not exceed 255 characters"),
  
  description: z.string()
    .max(1000, "Description too long")
    .nullable()
    .optional()
    .transform(val => val || null),
  
  price: z.number()
    .positive("Price must be positive")
    .finite(),
  
  originalPrice: z.number()
    .positive()
    .finite()
    .nullable()
    .optional()
    .transform(val => val || null),
  
  image: z.string()
    .max(500)
    .url("Invalid image URL")
    .nullable()
    .optional()
    .transform(val => val || null),
  
  images: z.array(z.string().url()).nullable().optional().transform(val => val || null),
  
  isActive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(9999),
  prepTimeMinutes: z.number().int().min(1).max(120).default(15),
  position: z.number().int().min(0).default(0)
};

// Product schemas
export const schemas = {
  create: z.object({
    ...baseProductFields,
    restaurantId: z.string().uuid("Valid restaurant ID required")
  }),

  update: z.object({
    ...baseProductFields,
    restaurantId: z.string().uuid().optional()
  }).partial(),

  discount: z.object({
    discountPercent: z.number()
      .min(0, "Discount must be 0-100")
      .max(100, "Discount must be 0-100"),
    
    discountExpiry: z.string()
      .datetime("Invalid ISO datetime")
      .nullable()
      .optional()
      .transform(val => val ? new Date(val) : null)
  })
};




export const validateRequest = (schemaKey) => {
  return async (req, res, next) => {
    try {
      const schema = schemas[schemaKey];
      const result = await schema.safeParseAsync(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            received: err.received
          }))
        });
      }

      // Attach validated + transformed data
      req.validatedData = result.data;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
};
