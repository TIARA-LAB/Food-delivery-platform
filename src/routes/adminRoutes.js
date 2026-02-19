import express from 'express';
import AdminController from '../controllers/adminController.js';
import { adminAuth } from '../middlewares/adminMiddleware.js';

const router = express.Router();

let controller;
try {
  controller = new AdminController();
} catch (error) {
  console.error('AdminController instantiation failed:', error);
  process.exit(1);
}

// PUBLIC LOGIN 
router.post('/login', controller.adminLogin.bind(controller)); 

//  PROTECTED ROUTES 
router.get('/dashboard', adminAuth, controller.dashboard.bind(controller));
router.get('/users', adminAuth, controller.getUsers.bind(controller));
router.patch('/users/:id/role', adminAuth, controller.updateUserRole.bind(controller));
router.get('/vendors', adminAuth, controller.getVendors.bind(controller));
router.patch('/vendors/:id/approve', adminAuth, controller.approveVendor.bind(controller));
router.get('/customers', adminAuth, controller.getCustomers.bind(controller));
router.get('/analytics', adminAuth, controller.getAnalytics.bind(controller));
router.get('/vendor-orders/:vendorId', adminAuth, controller.getVendorOrders.bind(controller));
router.get('/reviews', adminAuth, controller.getReviews.bind(controller));

export default router;
