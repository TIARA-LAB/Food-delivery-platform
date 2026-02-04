import { VendorService } from '../services/vendorService.js';
import { validationResult } from 'express-validator';
import { logInfo, logWarn, logError } from '../utils/logger.js';
export class VendorController {
 constructor() {
  this.vendorService = new VendorService();
 }

 // RESTAURANT OPERATIONS

 async getRestaurant(req, res) {
  try {
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
 async updateRestaurant(req, res) {
  try {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   logInfo('VendorController:updateRestaurant', { vendorId });

   const result = await this.vendorService.updateRestaurant(vendorId, req.body);

   res.status(200).json({
    success: true,
    data: result,
    message: 'Restaurant updated successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'updateRestaurant');
  }
 }

 async toggleRestaurantStatus(req, res) {
  try {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   const { isActive } = req.body;

   logInfo('VendorController:toggleRestaurantStatus', { vendorId, isActive });

   const result = await this.vendorService.toggleRestaurantStatus(vendorId, isActive);

   res.status(200).json({
    success: true,
    data: result,
    message: `Restaurant ${isActive ? 'activated' : 'deactivated'} successfully`
   });
  } catch (error) {
   this.handleError(req, res, error, 'toggleRestaurantStatus');
  }
 }

 // SCHEDULE & CLOSURES
 async upsertSchedule(req, res) {
  try {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   const scheduleData = req.body;

   logInfo('VendorController:upsertSchedule', { vendorId, dayOfWeek: scheduleData.dayOfWeek });

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

 async createClosure(req, res) {
  try {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   logInfo('VendorController:createClosure', { vendorId });

   const result = await this.vendorService.createClosure(vendorId, req.body);

   res.status(201).json({
    success: true,
    data: result,
    message: 'Closure created successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'createClosure');
  }
 }

 //MENU OPERATIONS 

 async createMenuCategory(req, res) {
  try {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   logInfo('VendorController:createMenuCategory', { vendorId });

   const result = await this.vendorService.createMenuCategory(vendorId, req.body);

   res.status(201).json({
    success: true,
    data: result,
    message: 'Menu category created successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'createMenuCategory');
  }
 }
 async createFoodItem(req, res) {
  try {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   const { categoryId } = req.params;

   logInfo('VendorController:createFoodItem', { vendorId, categoryId });

   const result = await this.vendorService.createFoodItem(vendorId, categoryId, req.body);

   res.status(201).json({
    success: true,
    data: result,
    message: 'Food item created successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'createFoodItem');
  }
 }
 async updateFoodItem(req, res) {
  try {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   const { foodId } = req.params;

   logInfo('VendorController:updateFoodItem', { vendorId, foodId });

   const result = await this.vendorService.updateFoodItem(vendorId, foodId, req.body);

   res.status(200).json({
    success: true,
    data: result,
    message: 'Food item updated successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'updateFoodItem');
  }
 }

 //ORDER MANAGEMENT

 async getOrders(req, res) {
  try {
   const vendorId = req.user.id;
   const { page = 1, limit = 20, status } = req.query;

   const statusArray = status ? status.split(',') : undefined;
   logInfo('VendorController:getOrders', { vendorId, page, limit, status });

   const result = await this.vendorService.getOrders(vendorId, {
    page: parseInt(page),
    limit: parseInt(limit)
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
 async updateOrderStatus(req, res) {
  try {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return this.validationError(errors, res);
   }

   const vendorId = req.user.id;
   const { orderId } = req.params;
   const { status } = req.body;

   logInfo('VendorController:updateOrderStatus', { vendorId, orderId, status });

   const result = await this.vendorService.updateOrderStatus(vendorId, orderId, status);

   res.status(200).json({
    success: true,
    data: result,
    message: 'Order status updated successfully'
   });
  } catch (error) {
   this.handleError(req, res, error, 'updateOrderStatus');
  }
 }

 //ANALYTICS & REPORTS

 async getAnalytics(req, res) {
  try {
   const vendorId = req.user.id;
   const { fromDate, toDate } = req.query;

   logInfo('VendorController:getAnalytics', { vendorId, fromDate, toDate });

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
 async getReviews(req, res) {
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

 async getActiveDeliveries(req, res) {
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

 //UTILITY METHODS

 validationError(errors, res) {
  const errorDetails = errors.array();
  logWarn('VendorController:validationError', {
   errors: errorDetails.length,
   fields: errorDetails.map(e => e.path)
  });

  return res.status(400).json({
   success: false,
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

  // Map service errors to HTTP status codes
  const statusMap = {
   'RESTAURANT_NOT_FOUND': 404,
   'ORDER_NOT_FOUND': 404,
   'CATEGORY_NOT_FOUND': 404,
   'UNAUTHORIZED_RESTAURANT_ACCESS': 403,
   'CANNOT_CLOSE_WITH_ACTIVE_ORDERS': 400,
   'INVALID_STATUS_TRANSITION': 400,
   'MAX_CATEGORIES_REACHED': 400,
   'MAX_ITEMS_PER_CATEGORY_REACHED': 400,
   'CLOSURE_OVERLAPS_EXISTING': 400,
   'OPENING_HOURS_MUST_PRECEDE_CLOSING': 400
  };

  const status = statusMap[error.message] || 500;
  const message = status === 500 ? 'Internal server error' : error.message;

  res.status(status).json({
   success: false,
   message
  });
 }
}

// Single instance export
export const vendorController = new VendorController();
