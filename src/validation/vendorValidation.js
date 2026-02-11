import {
  body,
  param,
  query,
  validationResult
} from 'express-validator';

export class VendorValidation {
  // RESTAURANT OPERATIONS
static createRestaurantValidation() {
    return [
      body('name')
        .trim()
        .notEmpty()
        .withMessage('Restaurant name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be 2-100 characters'),
      
      body('description')
        .optional()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Description must be 1-500 characters')
    ];
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
      body('city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('City must be 2-100 characters'),
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
    ];
  }

  static toggleRestaurantStatusValidation() {
    return [
      body('isActive')
        .notEmpty()
        .isBoolean()
        .toBoolean()
        .withMessage('isActive must be boolean (true/false)')
    ];
  }

  static getRestaurantValidation() {
    return []; // No validation needed for GET
  }

  // SCHEDULE OPERATIONS
  static upsertScheduleValidation() {
    return [
      body('dayOfWeek')
        .notEmpty()
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

  // MENU OPERATIONS
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
      body('preparationTime')
        .optional()
        .isInt({ min: 1, max: 120 })
        .toInt()
        .withMessage('Preparation time 1-120 minutes'),
      body('isAvailable')
        .optional()
        .isBoolean()
        .toBoolean()
    ];
  }

  // ORDER OPERATIONS
  static getOrdersValidation() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt(),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .toInt(),
      query('status')
        .optional()
        .isString()
    ];
  }

  static updateOrderStatusValidation() {
    return [
      param('orderId')
        .isUUID()
        .withMessage('Valid order UUID required'),
      body('status')
        .notEmpty()
        .isIn(['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'])
        .withMessage('Valid order status required')
    ];
  }

  // ANALYTICS & REPORTS
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
    ];
  }

  static getReviewsValidation() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt(),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .toInt()
    ];
  }
}
