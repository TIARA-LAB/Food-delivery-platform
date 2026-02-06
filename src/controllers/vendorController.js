import { VendorService } from '../service/vendorService.js';
import { validationResult } from 'express-validator';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import { AppError } from '../utils/error.js';

export class VendorController {
 constructor() {
  this.vendorService = new VendorService();
 }

 // Safe body parser middleware
 safeBodyParser(req, res, next) {
  req.body = req.body || {};
  next();
 }

 // RESTAURANT OPERATIONS
 async createRestaurant(req, res, next) {
  try {
   if (!req.user?.id) {
    return next(new AppError('Vendor authentication required', 401));
   }

   const vendorId = req.user.id;
   logInfo('VendorController:createRestaurant', { vendorId });

   const result = await this.vendorService.createRestaurant(vendorId);

   res.status(201).json({
    success: true,
    message: 'Restaurant created successfully',
    data: result
   });
  } catch (error) {
   this.handleError(req, res, error, 'createRestaurant');
  }
 }

 async getRestaurant(req, res, next) {
  try {
   if (!req.user?.id) {
    return next(new AppError('Vendor authentication required', 401));
   }

   const vendorId = req.user.id;
   logInfo('VendorController:getRestaurant', { vendorId });

   const restaurant = await this.vendorService.getRestaurant(vendorId);

   res.status(200).json({
    success: true,
    data: restaurant
   });
  } catch (error) {
   this.handleError(req, res, error, 'getRestaurant');
  }
 }

 async updateRestaurant(req, res, next) {
  try {
   if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError('No update data provided', 400));
   }

   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   const updateData = req.body;

   logInfo('VendorController:updateRestaurant', {
    vendorId,
    updates: Object.keys(updateData)
   });

   const result = await this.vendorService.updateRestaurant(vendorId, updateData);

   res.status(200).json({
    success: true,
    data: result,
    message: 'Restaurant updated successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'updateRestaurant');
  }
 }

 async toggleRestaurantStatus(req, res, next) {
  try {
   const vendorId = req.user.id;
   const body = req.body || {};

   if (typeof body.isActive === 'undefined') {
    return next(new AppError('isActive field is required (true/false)', 400));
   }

   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   logInfo('VendorController:toggleRestaurantStatus', { vendorId, isActive: body.isActive });

   const result = await this.vendorService.toggleRestaurantStatus(vendorId, Boolean(body.isActive));

   res.status(200).json({
    success: true,
    data: result,
    message: `Restaurant ${body.isActive ? 'activated' : 'deactivated'} successfully`
   });
  } catch (error) {
   this.handleError(req, res, error, 'toggleRestaurantStatus');
  }
 }

 // SCHEDULE OPERATIONS
 async upsertSchedule(req, res, next) {
  try {
   const scheduleData = req.body || {};
   if (!scheduleData.dayOfWeek || !scheduleData.opensAt || !scheduleData.closesAt) {
    return next(new AppError(
     'Missing required fields: dayOfWeek (0-6), opensAt (HH:MM), closesAt (HH:MM)',
     400
    ));
   }

   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   logInfo('VendorController:upsertSchedule', {
    vendorId,
    dayOfWeek: scheduleData.dayOfWeek,
    opensAt: scheduleData.opensAt
   });

   const result = await this.vendorService.upsertSchedule(vendorId, scheduleData);

   res.status(200).json({
    success: true,
    data: result,
    message: 'Schedule updated successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'upsertSchedule');
  }
 }

 // ORDERS
 async getOrders(req, res, next) {
  try {
   const vendorId = req.user.id;
   const { page = 1, limit = 20, status } = req.query;

   const statusArray = status ? status.split(',').filter(s => s.trim()) : undefined;

   logInfo('VendorController:getOrders', {
    vendorId,
    page: parseInt(page),
    limit: parseInt(limit),
    status: statusArray
   });

   const result = await this.vendorService.getOrders(vendorId, {
    page: parseInt(page),
    limit: Math.min(50, Math.max(1, parseInt(limit)))
   }, statusArray);

   res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination
   });
  } catch (error) {
   this.handleError(req, res, error, 'getOrders');
  }
 }

 async updateOrderStatus(req, res, next) {
  try {
   const { orderId } = req.params;
   const body = req.body || {};

   if (!orderId) {
    return next(new AppError('orderId parameter required', 400));
   }

   if (!body.status) {
    return next(new AppError('status field is required', 400));
   }

   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   logInfo('VendorController:updateOrderStatus', { vendorId, orderId, status: body.status });

   const result = await this.vendorService.updateOrderStatus(vendorId, orderId, body.status);

   res.status(200).json({
    success: true,
    data: result,
    message: 'Order status updated successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'updateOrderStatus');
  }
 }

 // ANALYTICS & REPORTS
 async getAnalytics(req, res, next) {
  try {
   const vendorId = req.user.id;
   const { fromDate, toDate } = req.query;

   logInfo('VendorController:getAnalytics', {
    vendorId,
    fromDate,
    toDate
   });

   const result = await this.vendorService.getAnalytics(
    vendorId,
    fromDate ? new Date(fromDate) : undefined,
    toDate ? new Date(toDate) : undefined
   );

   res.status(200).json({
    success: true,
    data: result
   });
  } catch (error) {
   this.handleError(req, res, error, 'getAnalytics');
  }
 }

 async getReviews(req, res, next) {
  try {
   const vendorId = req.user.id;

   logInfo('VendorController:getReviews', { vendorId });

   const result = await this.vendorService.getReviews(vendorId, req.query);

   res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination
   });
  } catch (error) {
   this.handleError(req, res, error, 'getReviews');
  }
 }

 async getActiveDeliveries(req, res, next) {
  try {
   const vendorId = req.user.id;

   logInfo('VendorController:getActiveDeliveries', { vendorId });

   const result = await this.vendorService.getActiveDeliveries(vendorId);

   res.status(200).json({
    success: true,
    data: result
   });
  } catch (error) {
   this.handleError(req, res, error, 'getActiveDeliveries');
  }
 }

 // UTILITY METHODS
 validationError(errors, res) {
  const errorDetails = errors.array();
  logWarn('VendorController:validationError', {
   errors: errorDetails.length,
   fields: errorDetails.map(e => e.path)
  });

  return res.status(400).json({
   success: false,
   message: 'Validation failed',
   errors: errorDetails.map(err => ({
    field: err.path,
    message: err.msg,
    value: err.value
   }))
  });
 }

 handleError(req, res, error, operation) {
  const vendorId = req?.user?.id || 'unknown';

  logError(`VendorController:${operation}`, {
   vendorId,
   error: error.message,
   stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  const statusMap = {
   'RESTAURANT_NOT_FOUND': 404,
   'ORDER_NOT_FOUND': 404,
   'CATEGORY_NOT_FOUND': 404,
   'FOOD_NOT_FOUND': 404,
   'UNAUTHORIZED_RESTAURANT_ACCESS': 403,
   'CANNOT_CLOSE_WITH_ACTIVE_ORDERS': 400,
   'INVALID_STATUS_TRANSITION': 400,
   'MAX_CATEGORIES_REACHED': 400,
   'MAX_ITEMS_PER_CATEGORY_REACHED': 400,
   'CLOSURE_OVERLAPS_EXISTING': 400,
   'OPENING_HOURS_MUST_PRECEDE_CLOSING': 400,
   'INVALID_TIME_FORMAT': 400,
   'INVALID_DAY_OF_WEEK': 400
  };

  let status = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
   status = error.statusCode || 500;
   message = error.message;
  } else if (statusMap[error.message]) {
   status = statusMap[error.message];
   message = error.message;
  } else {
   message = error.message || 'Internal server error';
  }

  res.status(status).json({
   success: false,
   message
  });
 }
}
