import { logInfo, logWarn, logError } from '../utils/logger.js';
import { AppError } from '../utils/error.js';
import { VendorService } from '../service/vendorService.js';

export class VendorController {
  constructor() {
    this.vendorService = new VendorService();
  }

  // RESTAURANT OPERATIONS
  async createRestaurant(req, res, next) {
    try {
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const data = req.validatedBody || req.body; 
      logInfo('VendorController:createRestaurant', { vendorId });

      const result = await this.vendorService.createRestaurant(vendorId, data);
      
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
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

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
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));
      if (!Object.keys(req.validatedBody || req.body).length) {
        return next(new AppError('No update data provided', 400));
      }

      const vendorId = req.user.id;
      const data = req.validatedBody || req.body;
      logInfo('VendorController:updateRestaurant', { vendorId, updates: Object.keys(data) });

      const result = await this.vendorService.updateRestaurant(vendorId, data);
      
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
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const data = req.validatedBody || req.body;
      const { isActive } = data;

      logInfo('VendorController:toggleRestaurantStatus', { vendorId, isActive });

      const result = await this.vendorService.toggleRestaurantStatus(vendorId, Boolean(isActive));
      
      res.status(200).json({
        success: true,
        data: result,
        message: `Restaurant ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      this.handleError(req, res, error, 'toggleRestaurantStatus');
    }
  }

  // SCHEDULE OPERATIONS
  async upsertSchedule(req, res, next) {
    try {
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const data = req.validatedBody || req.body;
      logInfo('VendorController:upsertSchedule', { vendorId });

      const result = await this.vendorService.upsertSchedule(vendorId, data);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Schedule updated successfully'
      });
    } catch (error) {
      this.handleError(req, res, error, 'upsertSchedule');
    }
  }

  // MENU OPERATIONS  
  async createMenuCategory(req, res, next) {
    try {
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const data = req.validatedBody || req.body;
      logInfo('VendorController:createMenuCategory', { vendorId });

      const result = await this.vendorService.createMenuCategory(vendorId, data);
      
      res.status(201).json({
        success: true,
        message: 'Menu category created successfully',
        data: result
      });
    } catch (error) {
      this.handleError(req, res, error, 'createMenuCategory');
    }
  }

  async createFoodItem(req, res, next) {
    try {
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const data = req.validatedBody || req.body;
      logInfo('VendorController:createFoodItem', { vendorId });

      const result = await this.vendorService.createFoodItem(vendorId, data);
      
      res.status(201).json({
        success: true,
        message: 'Food item created successfully',
        data: result
      });
    } catch (error) {
      this.handleError(req, res, error, 'createFoodItem');
    }
  }

  // ORDER OPERATIONS
  async getOrders(req, res, next) {
    try {
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const pagination = req.validatedQuery || req.query; 
      logInfo('VendorController:getOrders', { vendorId, pagination });

      const result = await this.vendorService.getVendorOrders(vendorId, pagination);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(req, res, error, 'getOrders');
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const orderId = req.params.orderId;
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

  // ANALYTICS & REPORTS
  async getAnalytics(req, res, next) {
    try {
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const queryParams = req.validatedQuery || req.query; 
      logInfo('VendorController:getAnalytics', { vendorId });

      const result = await this.vendorService.getVendorAnalytics(vendorId, queryParams);
      
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
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

      const vendorId = req.user.id;
      const pagination = req.validatedQuery || req.query; 
      logInfo('VendorController:getReviews', { vendorId });

      const result = await this.vendorService.getReviews(vendorId, pagination);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(req, res, error, 'getReviews');
    }
  }

  async getActiveDeliveries(req, res, next) {
    try {
      if (!req.user?.id) return next(new AppError('Vendor authentication required', 401));

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

  // ERROR HANDLING
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
      'VENDOR_NOT_FOUND': 403,
      'VENDOR_ALREADY_HAS_RESTAURANT': 400,
      'CANNOT_CLOSE_WITH_ACTIVE_ORDERS': 400,
      'MAX_CATEGORIES_REACHED': 400
    };

    let status = 500;
    let message = 'Internal server error';

    if (error instanceof AppError) {
      status = error.statusCode || 500;
      message = error.message;
    } else if (statusMap[error.message]) {
      status = statusMap[error.message];
      message = error.message.replace(/_/g, ' ').toLowerCase();
    } else {
      message = error.message || 'Internal server error';
    }

    res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}
