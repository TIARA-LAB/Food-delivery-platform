import express from 'express';
import AdminController from '../controllers/adminController.js';
import { adminAuth } from '../middlewares/adminMiddleware.js';

const router = express.Router();

let controller;
try {
  controller = new AdminController();
} catch (error) {
  console.error('🚨 AdminController instantiation failed:', error);
  process.exit(1);
}

router.use(adminAuth); 

router.get('/dashboard', controller.dashboard.bind(controller));
router.get('/users', controller.getUsers.bind(controller));
router.patch('/users/:id/role', controller.updateUserRole.bind(controller));
router.get('/vendors', controller.getVendors.bind(controller));
router.patch('/vendors/:id/approve', controller.approveVendor.bind(controller));
router.get('/customers', controller.getCustomers.bind(controller));
router.get('/analytics', controller.getAnalytics.bind(controller));
router.get('/vendor-orders/:vendorId', controller.getVendorOrders.bind(controller));
router.get('/reviews', controller.getReviews.bind(controller));

export default router;
