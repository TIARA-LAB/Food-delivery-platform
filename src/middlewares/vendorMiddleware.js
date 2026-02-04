import jwt from 'jsonwebtoken';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import { VendorRepository } from '../services/vendor.repository.js';

export class VendorAuthMiddleware {
 static vendorRepo = new VendorRepository();

 static async auth(req, res, next) {
  try {
   const token = req.headers.authorization?.replace('Bearer ', '');
   if (!token) {
    return res.status(401).json({
     success: false,
     message: 'Access token required'
    });
   }

   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   const vendorId = decoded.id;

   if (!vendorId) {
    return res.status(401).json({
     success: false,
     message: 'Invalid token payload'
    });
   }

   const vendor = await VendorAuthMiddleware.vendorRepo.getVendorById(vendorId);

   if (!vendor || !vendor.isActive) {
    logWarn('VendorAuthMiddleware: Inactive vendor access denied', { vendorId });
    return res.status(403).json({
     success: false,
     message: 'Vendor account inactive or not found'
    });
   }
   req.user = {
    id: vendorId,
    email: vendor.email
   };

   logInfo('VendorAuthMiddleware: Auth successful', { vendorId });
   next();
  } catch (error) {
   logError('VendorAuthMiddleware: JWT verification failed', {
    ip: req.ip,
    error: error.message
   });

   const message = error.name === 'TokenExpiredError'
    ? 'Token expired. Please login again'
    : 'Invalid or expired token';

   res.status(401).json({ success: false, message });
  }
 }

 static async requireActiveRestaurant(req, res, next) {
  try {
   const vendorId = req.user.id;

   const restaurant = await VendorAuthMiddleware.vendorRepo.getVendorRestaurant(vendorId);

   if (!restaurant || !restaurant.isActive) {
    logWarn('VendorAuthMiddleware: No active restaurant', { vendorId });
    return res.status(403).json({
     success: false,
     message: 'No active restaurant found for this vendor'
    });
   }

   req.restaurant = {
    id: restaurant.id,
    vendorId: restaurant.vendorId
   };

   logInfo('VendorAuthMiddleware: Restaurant validated', {
    vendorId,
    restaurantId: restaurant.id
   });

   next();
  } catch (error) {
   logError('VendorAuthMiddleware: Restaurant validation failed', {
    vendorId: req.user?.id,
    error: error.message
   });
   res.status(500).json({
    success: false,
    message: 'Server error during restaurant validation'
   });
  }
 }

 static async requireVendorOrder(req, res, next) {
  try {
   const vendorId = req.user.id;
   const { orderId } = req.params;
   const order = await VendorAuthMiddleware.vendorRepo.getOrderById(vendorId, orderId);

   if (!order) {
    logWarn('VendorAuthMiddleware: Order access denied', { vendorId, orderId });
    return res.status(404).json({
     success: false,
     message: 'Order not found or access denied'
    });
   }

   req.order = { id: orderId };
   logInfo('VendorAuthMiddleware: Order validated', { vendorId, orderId });

   next();
  } catch (error) {
   logError('VendorAuthMiddleware: Order validation failed', {
    vendorId: req.user?.id,
    orderId: req.params?.orderId,
    error: error.message
   });
   res.status(500).json({
    success: false,
    message: 'Server error during order validation'
   });
  }
 }
}

// ✅ EXPRESS ROUTER USAGE - PERFECT STACK ALIGNMENT
/*
GET /vendor/restaurant
  VendorAuthMiddleware.auth,                    // JWT → req.user.id
  VendorAuthMiddleware.requireActiveRestaurant, // 1 restaurant exists
  VendorValidation.getRestaurantValidation(),
  vendorController.getRestaurant

PATCH /vendor/orders/:orderId/status
  VendorAuthMiddleware.auth,                    // JWT → req.user.id  
  VendorAuthMiddleware.requireVendorOrder,      // Owns this order
  VendorValidation.updateOrderStatusValidation(),
  vendorController.updateOrderStatus
*/
export const vendorAuthMiddleware = VendorAuthMiddleware;
export default VendorAuthMiddleware;
