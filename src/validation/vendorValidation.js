import {
 body,
 param,
 query,
} from 'express-validator';

export class VendorValidation {
 //RESTAURANT OPERATIONS

 static getRestaurantValidation() {
  return [];
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
    .isBoolean()
    .toBoolean()
    .withMessage('isActive must be boolean')
  ];
 }

 //SCHEDULE & CLOSURES

 static upsertScheduleValidation() {
  return [
   body('dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('dayOfWeek must be 0-6 (Sunday-Saturday)'),
   body('opensAt')
    .isLength({ min: 5, max: 5 })
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('opensAt must be HH:MM format')
    .custom((value, { req }) => {
     if (value >= req.body.closesAt) {
      throw new Error('opensAt must precede closesAt');
     }
     return true;
    }),
   body('closesAt')
    .isLength({ min: 5, max: 5 })
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('closesAt must be HH:MM format'),
   body('isClosed')
    .optional()
    .isBoolean()
    .toBoolean()
  ];
 }

 static createClosureValidation() {
  return [
   body('startDate')
    .isISO8601()
    .toDate()
    .withMessage('startDate must be valid ISO date'),
   body('endDate')
    .isISO8601()
    .toDate()
    .withMessage('endDate must be valid ISO date')
    .custom((value, { req }) => {
     if (value <= req.body.startDate) {
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

 // MENU OPERATIONS

 static createMenuCategoryValidation() {
  return [
   body('name')
    .trim()
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
   param('categoryId').isUUID().withMessage('Valid category UUID required'),
   body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be 2-100 characters')
    .escape(),
   body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .escape(),
   body('price')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Price must be 0.01-10000')
    .toFloat(),

   body('isAvailable')
    .optional()
    .isBoolean()
    .toBoolean()
  ];
 }

 static updateFoodItemValidation() {
  return [
   param('foodId').isUUID().withMessage('Valid food item UUID required'),
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
    .toBoolean()
  ];
 }

 //ORDER OPERATIONS

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
    .isArray()
    .custom((value) => {
     const validStatuses = [
      'PENDING', 'CONFIRMED', 'ON_THE_WAY',
      'DELIVERED', 'CANCELLED', 'PREPARING', 'READY'
     ];
     return value.every(status => validStatuses.includes(status));
    })
    .withMessage('Invalid order status')
  ];
 }

 static updateOrderStatusValidation() {
  return [
   param('orderId').isUUID().withMessage('Valid order UUID required'),
   body('status').isIn([
    'CONFIRMED', 'PREPARING', 'READY',
    'ON_THE_WAY', 'DELIVERED', 'CANCELLED'
   ]).withMessage('Invalid order status')
  ];
 }

 //ANALYTICS
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
     if (req.query.fromDate && value <= req.query.fromDate) {
      throw new Error('toDate must be after fromDate');
     }
     return true;
    })
  ];
 }

 //REVIEWS

 static getReviewsValidation() {
  return VendorValidation.getOrdersValidation(); // Same pagination
 }
}

// EXPORTS FOR CONVENIENCE 
export const {
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
 getReviewsValidation
} = VendorValidation;
