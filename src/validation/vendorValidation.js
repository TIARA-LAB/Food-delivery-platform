import { z } from 'zod';

const RestaurantSchemas = {
  create: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional()
  }),
  
  update: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional()
  })
};

const ScheduleSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  opensAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM format (09:00)'),
  closesAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM format (17:00)'),
  isClosed: z.boolean().optional()
}).refine(data => data.opensAt < data.closesAt, {
  message: 'opensAt must be before closesAt',
  path: ['opensAt']
});

const MenuSchemas = {
  createCategory: z.object({
    name: z.string().min(2).max(50),
    position: z.coerce.number().int().min(0).optional()
  }),
  
  createFoodItem: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    price: z.coerce.number().min(0.01).max(10000),
    preparationTime: z.coerce.number().int().min(1).max(120).optional().default(15),
    imageUrl: z.string().url().optional().or(z.literal('')),
    position: z.coerce.number().int().min(0).optional()
  })
};

const OrderSchemas = {
  getQuery: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: z.string().optional()
  }),
  
  updateStatus: z.object({
    orderId: z.string().uuid(),
    status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'])
  })
};

const AnalyticsSchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional()
});

export class VendorValidation {
  static sendValidationError(res, issues) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        value: issue.received
      }))
    });
  }

  // RESTAURANT OPERATIONS
  static createRestaurantValidation() {
    return (req, res, next) => {
      const result = RestaurantSchemas.create.safeParse(req.body);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedBody = result.data; 
      next();
    };
  }

  static updateRestaurantValidation() {
    return (req, res, next) => {
      const result = RestaurantSchemas.update.safeParse(req.body);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedBody = result.data;
      next();
    };
  }

  static toggleRestaurantStatusValidation() {
    return (req, res, next) => {
      const result = z.object({ isActive: z.boolean() }).safeParse(req.body);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedBody = result.data;
      next();
    };
  }

  static getRestaurantValidation() {
    return (req, res, next) => next();
  }

  // SCHEDULE OPERATIONS
  static upsertScheduleValidation() {
    return (req, res, next) => {
      const result = ScheduleSchema.safeParse(req.body);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedBody = result.data;
      next();
    };
  }

  // MENU OPERATIONS
  static createMenuCategoryValidation() {
    return (req, res, next) => {
      const result = MenuSchemas.createCategory.safeParse(req.body);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedBody = result.data;
      next();
    };
  }

  static createFoodItemValidation() {
    return (req, res, next) => {
      const result = MenuSchemas.createFoodItem.safeParse(req.body);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedBody = result.data;
      next();
    };
  }

  static getOrdersValidation() {
    return (req, res, next) => {
      const result = OrderSchemas.getQuery.safeParse(req.query);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedQuery = result.data; 
      next();
    };
  }

  static updateOrderStatusValidation() {
    return (req, res, next) => {
      const result = OrderSchemas.updateStatus.safeParse({
        orderId: req.params.orderId,
        status: req.body?.status
      });
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      next();
    };
  }

  static getAnalyticsValidation() {
    return (req, res, next) => {
      const result = AnalyticsSchema.safeParse(req.query);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedQuery = result.data;
      next();
    };
  }

  static getReviewsValidation() {
    return (req, res, next) => {
      const result = OrderSchemas.getQuery.safeParse(req.query);
      if (!result.success) {
        return VendorValidation.sendValidationError(res, result.error.issues);
      }
      req.validatedQuery = result.data; 
      next();
    };
  }
}
