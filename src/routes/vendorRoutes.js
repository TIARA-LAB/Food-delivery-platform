import { Router } from 'express';
import express from 'express';  // ✅ ADDED MISSING IMPORT
import rateLimit from 'express-rate-limit';
import { VendorController } from '../controllers/vendorController.js';
import { VendorValidation } from '../validation/vendorValidation.js';
import {
  authenticateToken,
  authorizeRoles
} from '../middlewares/authMiddleware.js';
import { logInfo } from '../utils/logger.js';

const router = Router();
const vendorController = new VendorController();

// Rate Limiting
const vendorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const restaurantCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1,
  message: { success: false, message: 'One restaurant per vendor only' }
});

// Global Middleware Stack
router.use(express.json({ limit: '10mb' }));  // ✅ NOW WORKS
router.use(authenticateToken);
router.use(authorizeRoles('VENDOR'));
router.use(vendorLimiter);

// Logging Middleware
router.use((req, res, next) => {
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
router.post('/restaurant',
  restaurantCreationLimiter,
  VendorValidation.createRestaurantValidation(),
  vendorController.createRestaurant.bind(vendorController)
);

router.get('/restaurant',
  VendorValidation.getRestaurantValidation(),
  vendorController.getRestaurant.bind(vendorController)
);

router.patch('/restaurant',
  VendorValidation.updateRestaurantValidation(),
  vendorController.updateRestaurant.bind(vendorController)
);

router.patch('/restaurant/status',
  VendorValidation.toggleRestaurantStatusValidation(),
  vendorController.toggleRestaurantStatus.bind(vendorController)
);

// SCHEDULE OPERATIONS
router.post('/schedule',
  VendorValidation.upsertScheduleValidation(),
  vendorController.upsertSchedule.bind(vendorController)
);

// MENU OPERATIONS
router.post('/menu/categories',
  VendorValidation.createMenuCategoryValidation(),
  vendorController.createMenuCategory.bind(vendorController)
);

router.post('/menu/food',
  VendorValidation.createFoodItemValidation(),
  vendorController.createFoodItem.bind(vendorController)
);

// ORDER OPERATIONS
router.get('/orders',
  VendorValidation.getOrdersValidation(),
  vendorController.getOrders.bind(vendorController)
);

router.patch('/orders/:orderId/status',
  VendorValidation.updateOrderStatusValidation(),
  vendorController.updateOrderStatus.bind(vendorController)
);

// ANALYTICS & REPORTS
router.get('/analytics',
  VendorValidation.getAnalyticsValidation(),
  vendorController.getAnalytics.bind(vendorController)
);

router.get('/reviews',
  VendorValidation.getReviewsValidation(),
  vendorController.getReviews.bind(vendorController)
);

router.get('/deliveries/active',
  vendorController.getActiveDeliveries.bind(vendorController)
);

// 404 Handler
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Vendor route not found: ${req.originalUrl}`
  });
});

export default router;
