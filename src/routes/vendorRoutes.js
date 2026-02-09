import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  authenticateToken,
  authorizeRoles
} from '../middlewares/authMiddleware.js';
import { VendorController } from '../controllers/vendorController.js';
import { VendorValidation } from '../validation/vendorValidation.js';
import { logInfo } from '../utils/logger.js';

const router = Router();
const vendorController = new VendorController();

// RATE LIMITERS
const vendorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many vendor requests' }
});

const restaurantCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1,
  message: { success: false, message: 'One restaurant per vendor only' }
});

// MIDDLEWARE ORDER
router.use(express.json({ limit: '10mb' }));
router.use(authenticateToken);
router.use(authorizeRoles('VENDOR'));
router.use(vendorLimiter);

router.use((req, res, next) => {
  logInfo('Vendor API Access', {
    vendorId: req.user?.id,
    email: req.user?.email,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    hasBody: Object.keys(req.body || {}).length > 0
  });
  next();
});

// RESTAURANT OPERATIONS
router.post('/restaurant',
  restaurantCreationLimiter,
  VendorValidation.createRestaurantValidation(),
  (req, res, next) => vendorController.createRestaurant(req, res, next)
);

router.get('/restaurant',
  VendorValidation.getRestaurantValidation(),
  (req, res, next) => vendorController.getRestaurant(req, res, next)
);

router.patch('/restaurant',
  VendorValidation.updateRestaurantValidation(),
  (req, res, next) => vendorController.updateRestaurant(req, res, next)
);

router.patch('/restaurant/status',
  VendorValidation.toggleRestaurantStatusValidation(),
  (req, res, next) => vendorController.toggleRestaurantStatus(req, res, next)
);

// SCHEDULE OPERATIONS
router.post('/schedule',
  VendorValidation.upsertScheduleValidation(),
  (req, res, next) => vendorController.upsertSchedule(req, res, next)
);

// MENU OPERATIONS
router.post('/menu/categories',
  VendorValidation.createMenuCategoryValidation(),
  (req, res, next) => vendorController.createMenuCategory(req, res, next)
);

router.post('/menu/:categoryId/food',
  VendorValidation.createFoodItemValidation(),
  (req, res, next) => vendorController.createFoodItem(req, res, next)
);

// ORDERS
router.get('/orders',
  VendorValidation.getOrdersValidation(),
  (req, res, next) => vendorController.getOrders(req, res, next)
);

router.patch('/orders/:orderId/status',
  VendorValidation.updateOrderStatusValidation(),
  (req, res, next) => vendorController.updateOrderStatus(req, res, next)
);

// ANALYTICS & REPORTS
router.get('/analytics',
  VendorValidation.getAnalyticsValidation(),
  (req, res, next) => vendorController.getAnalytics(req, res, next)
);

router.get('/reviews',
  VendorValidation.getReviewsValidation(),
  (req, res, next) => vendorController.getReviews(req, res, next)
);

router.get('/deliveries/active',
  (req, res, next) => vendorController.getActiveDeliveries(req, res, next)
);

// 404 HANDLER
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Vendor route not found: ${req.originalUrl}`
  });
});

export default router;
