import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
 authenticateToken,
 authorizeRoles
} from '../middlewares/authMiddleware.js';
import { VendorController } from '../controllers/vendorController.js';
import { logInfo, logError } from '../utils/logger.js';
import prisma from '../config/db.js';

const router = Router();
const vendorController = new VendorController();

// RATE LIMITERS
const vendorLimiter = rateLimit({
 windowMs: 15 * 60 * 1000,
 max: 100,
 message: { success: false, message: 'Too many vendor requests' }
});

const restaurantCreationLimiter = rateLimit({
 windowMs: 24 * 60 * 1000,
 max: 1,
 message: { success: false, message: 'One restaurant per vendor only' }
});

// MIDDLEWARE ORDER - IMPORTANT: body parser FIRST
router.use((req, res, next) => {
 req.body = req.body || {};
 next();
});

// GLOBAL MIDDLEWARE (auth/logging after body parsing)
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

// RESTAURANT OPERATIONS - USE CONTROLLER
router.post('/restaurant', restaurantCreationLimiter,
 vendorController.createRestaurant.bind(vendorController)
);

router.get('/restaurant',
 vendorController.getRestaurant.bind(vendorController)
);

router.patch('/restaurant/status',
 vendorController.toggleRestaurantStatus.bind(vendorController)
);

router.patch('/restaurant',
 vendorController.updateRestaurant.bind(vendorController)
);

// ORDERS
router.get('/orders',
 vendorController.getOrders.bind(vendorController)
);

router.patch('/orders/:orderId/status',
 vendorController.updateOrderStatus.bind(vendorController)
);

// SCHEDULE
router.post('/schedule',
 vendorController.upsertSchedule.bind(vendorController)
);

// ANALYTICS & REPORTS
router.get('/analytics',
 vendorController.getAnalytics.bind(vendorController)
);

router.get('/reviews',
 vendorController.getReviews.bind(vendorController)
);

router.get('/deliveries/active',
 vendorController.getActiveDeliveries.bind(vendorController)
);

// 404 ERROR HANDLER - LAST
router.use((req, res) => {
 res.status(404).json({
  success: false,
  message: `Route not found: ${req.originalUrl}. Try: /restaurant, /orders, /schedule`
 });
});

export default router;
