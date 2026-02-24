import express from 'express';
import AdminController from '../controllers/adminController.js';
import { handleHttpError } from '../utils/error.js';
import { adminAuth, superAdminAuth } from '../middlewares/adminMiddleware.js';

const router = express.Router();
const controller = new AdminController();

// HANDLER FACTORY 
const createHandler = (controllerMethod) => (req, res) => 
  controllerMethod.call(controller, req, res).catch(err => handleHttpError(res, err));

// ROUTE DEFINITIONS
router.post('/super-admin', createHandler(controller.createSuperAdmin));
router.post('/login', createHandler(controller.adminLogin));
router.post('/users', superAdminAuth, createHandler(controller.createUser));
router.get('/dashboard', adminAuth, createHandler(controller.getDashboard));
router.get('/stats', adminAuth, createHandler(controller.getAdminStats));
router.get('/users', adminAuth, createHandler(controller.getUsers));
router.get('/customers', adminAuth, createHandler(controller.getCustomers));
router.get('/vendors', adminAuth, createHandler(controller.getVendors));
router.patch('/users/:id/role', adminAuth, createHandler(controller.updateUserRole));
router.patch('/vendors/:id/approve', adminAuth, createHandler(controller.approveVendor));
router.get('/analytics', adminAuth, createHandler(controller.getAnalytics));
router.get('/reviews', adminAuth, createHandler(controller.getReviews));
router.get('/vendor-orders/:vendorId', adminAuth, createHandler(controller.getVendorOrders));
router.post('/api-key/regenerate', superAdminAuth, createHandler(controller.regenerateApiKey));

export default router;
