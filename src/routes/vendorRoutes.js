import express from 'express';
import rateLimit from 'express-rate-limit';
import { vendorController } from '../controllers/vendorController.js';
import { vendorAuthMiddleware } from '../middlewares/vendorMiddleware.js'
import {
 // RESTAURANT OPERATIONS
 getRestaurantValidation,
 updateRestaurantValidation,
 toggleRestaurantStatusValidation,
 // SCHEDULE & CLOSURES
 upsertScheduleValidation,
 createClosureValidation,
 // MENU OPERATIONS
 createMenuCategoryValidation,
 createFoodItemValidation,
 updateFoodItemValidation,
 // ORDER OPERATIONS
 getOrdersValidation,
 updateOrderStatusValidation,
 // ANALYTICS & REVIEWS
 getAnalyticsValidation,
 getReviewsValidation
} from '../validation/vendorValidation.js'
import { logInfo } from '../utils/logger.js';

const router = express.Router();

//RATE LIMITERS
const vendorLimiter = rateLimit({
 windowMs: 15 * 60 * 1000, // 15 minutes
 max: 100, // 100 requests per vendor
 message: {
  success: false,
  message: 'Too many vendor requests. Please try again later.'
 },
 standardHeaders: true,
 legacyHeaders: false
});

// GLOBAL MIDDLEWARE STACK 
router.use(vendorAuthMiddleware.auth);                    // 1. JWT → req.user.id
router.use(vendorLimiter);                                // 2. Rate limiting
router.use((req, res, next) => {                          // 3. Structured logging
 logInfo('Vendor API Access', {
  vendorId: req.user?.id,
  email: req.user?.email,
  method: req.method,
  path: req.originalUrl,
  ip: req.ip
 });
 next();
});

// RESTAURANT OPERATIONS
router.get('/restaurant',
 vendorAuthMiddleware.requireActiveRestaurant,
 getRestaurantValidation(),
 vendorController.getRestaurant
);

router.patch('/restaurant',
 vendorAuthMiddleware.requireActiveRestaurant,
 updateRestaurantValidation(),
 vendorController.updateRestaurant
);

router.patch('/restaurant/status',
 vendorAuthMiddleware.requireActiveRestaurant,
 toggleRestaurantStatusValidation(),
 vendorController.toggleRestaurantStatus
);

//SCHEDULE & CLOSURES 
router.put('/schedule/:dayOfWeek',
 vendorAuthMiddleware.requireActiveRestaurant,
 upsertScheduleValidation(),
 vendorController.upsertSchedule
);

router.post('/closures',
 vendorAuthMiddleware.requireActiveRestaurant,
 createClosureValidation(),
 vendorController.createClosure
);

// MENU OPERATIONS
router.post('/menu-categories',
 vendorAuthMiddleware.requireActiveRestaurant,
 createMenuCategoryValidation(),
 vendorController.createMenuCategory
);

router.post('/menu-items/:categoryId',
 vendorAuthMiddleware.requireActiveRestaurant,
 createFoodItemValidation(),
 vendorController.createFoodItem
);

router.patch('/food-items/:foodId',
 vendorAuthMiddleware.requireActiveRestaurant,
 updateFoodItemValidation(),
 vendorController.updateFoodItem
);

// MANAGEMENT
router.get('/orders',
 getOrdersValidation(),
 vendorController.getOrders
);

router.patch('/orders/:orderId/status',
 vendorAuthMiddleware.requireVendorOrder,
 updateOrderStatusValidation(),
 vendorController.updateOrderStatus
);

// ANALYTICS & REPORTS 
router.get('/analytics',
 getAnalyticsValidation(),
 vendorController.getAnalytics
);

router.get('/reviews',
 getReviewsValidation(),
 vendorController.getReviews
);

router.get('/deliveries',
 vendorController.getActiveDeliveries
);

export default router;
