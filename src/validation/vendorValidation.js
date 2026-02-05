import {
  body,
  param,
  query,
  validationResult
} from 'express-validator';

export class VendorValidation {
  // ========================================
  // RESTAURANT OPERATIONS
  // ========================================

  static createRestaurantValidation() {
    return [
      body('name')
        .trim()
        .notEmpty()
        .isLength({ min: 2, max: 100 })
        .withMessage('Restaurant name must be 2-100 characters')
        .escape(),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description max 500 characters')
        .escape(),
      body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Invalid phone number'),
      body('address')
        .notEmpty()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Address must be 5-200 characters'),
      body('deliveryRadius')
        .optional()
        .isInt({ min: 1, max: 50 })
        .toInt()
        .withMessage('Delivery radius 1-50km'),
      body('deliveryFee')
        .optional()
        .isFloat({ min: 0 })
        .toFloat()
        .withMessage('Delivery fee >= 0')
    ];
  }

  static getRestaurantValidation() {
    return []; // No body params for GET
  }

  static updateRestaurantValidation() {
    return [
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Restaurant name must be 2-100 characters')
        .escape(),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description max 500 characters')
        .escape(),
      body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Invalid phone number'),
      body('address')
        .optional()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Address must be 5-200 characters'),
      body('deliveryRadius')
        .optional()
        .isInt({ min: 1, max: 50 })
        .toInt()
        .withMessage('Delivery radius 1-50km'),
      body('deliveryFee')
        .optional()
        .isFloat({ min: 0 })
        .toFloat()
        .withMessage('Delivery fee >= 0'),
      body('isActive')
        .optional()
        .isBoolean()
        .toBoolean()
        .custom((value, { req }) => {
          if (value && (!req.body.name || req.body.name.trim().length < 2)) {
            throw new Error('Name required for active restaurants');
          }
          return true;
        })
        .withMessage('Name required when activating restaurant')
    ];
  }

  static toggleRestaurantStatusValidation() {
    return [
      body('isActive')
        .notEmpty()
        .isBoolean()
        .toBoolean()
        .withMessage('isActive must be boolean')
    ];
  }

  // ========================================
  // SCHEDULE & CLOSURES
  // ========================================

  static upsertScheduleValidation() {
    return [
      param('dayOfWeek')
        .isInt({ min: 0, max: 6 })
        .toInt()
        .withMessage('dayOfWeek must be 0-6 (Sunday-Saturday)'),
      body('opensAt')
        .notEmpty()
        .isLength({ min: 5, max: 5 })
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('opensAt must be HH:MM format (09:00)')
        .custom((value, { req }) => {
          if (value && req.body.closesAt && value >= req.body.closesAt) {
            throw new Error('opensAt must be before closesAt');
          }
          return true;
        }),
      body('closesAt')
        .notEmpty()
        .isLength({ min: 5, max: 5 })
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('closesAt must be HH:MM format (17:00)'),
      body('isClosed')
        .optional()
        .isBoolean()
        .toBoolean()
    ];
  }

  static createClosureValidation() {
    return [
      body('startDate')
        .notEmpty()
        .isISO8601()
        .toDate()
        .withMessage('startDate must be valid ISO date (2026-02-04)'),
      body('endDate')
        .notEmpty()
        .isISO8601()
        .toDate()
        .withMessage('endDate must be valid ISO date')
        .custom((value, { req }) => {
          if (new Date(value) <= new Date(req.body.startDate)) {
            throw new Error('endDate must be after startDate');
          }
          return true;
        }),
      body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .escape()
    ];
  }

  // ========================================
  // MENU OPERATIONS
  // ========================================

  static createMenuCategoryValidation() {
    return [
      body('name')
        .trim()
        .notEmpty()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category name must be 2-50 characters')
        .escape(),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .escape()
    ];
  }

  static createFoodItemValidation() {
    return [
      param('categoryId')
        .isUUID()
        .withMessage('Valid category UUID required'),
      body('name')
        .trim()
        .notEmpty()
        .isLength({ min: 2, max: 100 })
        .withMessage('Item name must be 2-100 characters')
        .escape(),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .escape(),
      body('price')
        .notEmpty()
        .isFloat({ min: 0.01, max: 10000 })
        .withMessage('Price must be 0.01-10000')
        .toFloat(),
      body('isAvailable')
        .optional()
        .isBoolean()
        .toBoolean()
        .default(true),
      body('preparationTime')
        .optional()
        .isInt({ min: 1, max: 120 })
        .toInt()
        .withMessage('Preparation time 1-120 minutes')
    ];
  }

  static updateFoodItemValidation() {
    return [
      param('foodId')
        .isUUID()
        .withMessage('Valid food item UUID required'),
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Item name must be 2-100 characters')
        .escape(),
      body('price')
        .optional()
        .isFloat({ min: 0.01, max: 10000 })
        .toFloat()
        .withMessage('Price must be 0.01-10000'),
      body('isAvailable')
        .optional()
        .isBoolean()
        .toBoolean(),
      body('preparationTime')
        .optional()
        .isInt({ min: 1, max: 120 })
        .toInt()
    ];
  }

  // ========================================
  // ORDER OPERATIONS
  // ========================================

  static getOrdersValidation() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt()
        .default(1),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .toInt()
        .default(10),
      query('status')
        .optional()
        .isArray()
        .custom((value) => {
          const validStatuses = [
            'PENDING', 'CONFIRMED', 'PREPARING',
            'READY', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'
          ];
          return Array.isArray(value) ?
            value.every(status => validStatuses.includes(status)) :
            validStatuses.includes(value);
        })
        .withMessage('Invalid order status')
    ];
  }

  static updateOrderStatusValidation() {
    return [
      param('orderId')
        .isUUID()
        .withMessage('Valid order UUID required'),
      body('status')
        .notEmpty()
        .isIn([
          'CONFIRMED', 'PREPARING', 'READY',
          'ON_THE_WAY', 'DELIVERED', 'CANCELLED'
        ])
        .withMessage('Invalid order status')
    ];
  }

  // ========================================
  // ANALYTICS & REVIEWS
  // ========================================

  static getAnalyticsValidation() {
    return [
      query('fromDate')
        .optional()
        .isISO8601()
        .toDate(),
      query('toDate')
        .optional()
        .isISO8601()
        .toDate()
        .custom((value, { req }) => {
          if (req.query.fromDate && new Date(value) <= new Date(req.query.fromDate)) {
            throw new Error('toDate must be after fromDate');
          }
          return true;
        }),
      query('groupBy')
        .optional()
        .isIn(['day', 'week', 'month'])
    ];
  }

  static getReviewsValidation() {
    return VendorValidation.getOrdersValidation(); // Same pagination logic
  }

  // ========================================
  // UTILITY: Validation Result Handler
  // ========================================
  static handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  };
}

// ========================================
// NAMED EXPORTS (For Routes)
// ========================================
export const {
  createRestaurantValidation,
  getRestaurantValidation,
  updateRestaurantValidation,
  toggleRestaurantStatusValidation,
  upsertScheduleValidation,
  createClosureValidation,
  createMenuCategoryValidation,
  createFoodItemValidation,
  updateFoodItemValidation,
  getOrdersValidation,
  updateOrderStatusValidation,
  getAnalyticsValidation,
  getReviewsValidation,
  handleValidation
} = VendorValidation;

export default VendorValidation;
