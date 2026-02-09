import { validationResult } from 'express-validator';
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
      if (!req.user?.id) {
        return next(new AppError('Vendor authentication required', 401));
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.validationError(errors, res);
      }

      const vendorId = req.user.id;
      logInfo('VendorController:createRestaurant', { vendorId });

      const result = await this.vendorService.createRestaurant(vendorId, req.body);

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
      logInfo('VendorController:updateRestaurant', {
        vendorId,
        updates: Object.keys(req.body)
      });

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

  async toggleRestaurantStatus(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.validationError(errors, res);
      }

      const vendorId = req.user.id;
      const { isActive } = req.body;

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

  // ... [all other methods remain exactly the same until handleError] ...

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
      'VENDOR_NOT_FOUND': 404,
      'FAILED_TO_CREATE_RESTAURANT': 400,      
      'FAILED_TO_FETCH_RESTAURANT': 404,      
      'FAILED_TO_UPDATE_RESTAURANT': 400,   
      'FAILED_TO_TOGGLE_STATUS': 400,         
      'FAILED_TO_UPDATE_SCHEDULE': 400,       
      'FAILED_TO_CREATE_CATEGORY': 400,
      'FAILED_TO_CREATE_ITEM': 400,       
      'FAILED_TO_FETCH_ORDERS': 400,          
      'FAILED_TO_UPDATE_ORDER': 400,         
      'FAILED_TO_FETCH_ANALYTICS': 400,        
      'FAILED_TO_FETCH_REVIEWS': 400,          
      'FAILED_TO_FETCH_DELIVERIES': 400,       
      'UNAUTHORIZED_RESTAURANT_ACCESS': 403,
      'CANNOT_CLOSE_WITH_ACTIVE_ORDERS': 400,
      'INVALID_STATUS_TRANSITION': 400,
      'MAX_CATEGORIES_REACHED': 400,
      'MAX_ITEMS_PER_CATEGORY_REACHED': 400,
      'CLOSURE_OVERLAPS_EXISTING': 400,
      'OPENING_HOURS_MUST_PRECEDE_CLOSING': 400,
      'INVALID_TIME_FORMAT': 400,
      'INVALID_DAY_OF_WEEK': 400,
      'VENDOR_ALREADY_HAS_RESTAURANT': 400
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
      message,
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}
