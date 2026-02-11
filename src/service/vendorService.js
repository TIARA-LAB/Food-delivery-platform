import { VendorRepository } from '../repository/vendorRepository.js';
import { logError } from '../utils/logger.js';

export class VendorService {
  constructor() {
    this.repo = new VendorRepository();
  }

  // HELPER METHODS
  isRestaurantOpen(schedules) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    const todaySchedule = schedules?.find(s => s.dayOfWeek === dayOfWeek);
    if (!todaySchedule) return false;

    return currentTime >= todaySchedule.opensAt && currentTime <= todaySchedule.closesAt;
  }

  // RESTAURANT OPERATIONS
  async createRestaurant(vendorId, restaurantData) {
    try {
      const vendor = await this.repo.getVendorById(vendorId);
      if (!vendor) throw new Error('VENDOR_NOT_FOUND');

      const existing = await this.repo.getVendorRestaurant(vendorId);
      if (existing) throw new Error('VENDOR_ALREADY_HAS_RESTAURANT');

      return await this.repo.createRestaurant(vendorId, restaurantData);
    } catch (error) {
      logError(`createRestaurant failed: vendorId=${vendorId}`, { 
        error: error.message,
        restaurantData: restaurantData ? Object.keys(restaurantData) : null 
      });
      throw error instanceof Error ? error : new Error('FAILED_TO_CREATE_RESTAURANT');
    }
  }

  async getRestaurant(vendorId) {
    try {
      const restaurant = await this.repo.getVendorRestaurant(vendorId);
      if (!restaurant) {
        throw new Error('RESTAURANT_NOT_FOUND');
      }

      const sanitizedCategories = restaurant.menuCategories.filter(
        cat => cat.items.length > 0
      );

      return {
        ...restaurant,
        menuCategories: sanitizedCategories,
        isOpenNow: this.isRestaurantOpen(restaurant.schedules)
      };
    } catch (error) {
      logError(`getRestaurant failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_FETCH_RESTAURANT');
    }
  }

  async updateRestaurant(vendorId, updateData) {
    try {
      await this.repo.getVendorById(vendorId);
      
      const restaurant = await this.repo.getVendorRestaurant(vendorId);
      if (!restaurant) throw new Error('RESTAURANT_NOT_FOUND');

      return await this.repo.updateRestaurant(vendorId, updateData);
    } catch (error) {
      logError(`updateRestaurant failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_UPDATE_RESTAURANT');
    }
  }

  async toggleRestaurantStatus(vendorId, isActive) {
    try {
      await this.repo.getVendorById(vendorId);
      
      // Check for active orders before deactivating
      if (!isActive) {
        const activeOrders = await this.repo.getVendorOrders(vendorId, {}, ['CONFIRMED', 'ON_THE_WAY']);
        if (activeOrders.data.length > 0) {
          throw new Error('CANNOT_CLOSE_WITH_ACTIVE_ORDERS');
        }
      }

      return await this.repo.toggleRestaurantStatus(vendorId, isActive);
    } catch (error) {
      logError(`toggleRestaurantStatus failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_TOGGLE_STATUS');
    }
  }

  // SCHEDULE OPERATIONS
  async upsertSchedule(vendorId, scheduleData) {
    try {
      await this.repo.getVendorById(vendorId);
      return await this.repo.upsertSchedule(vendorId, scheduleData);
    } catch (error) {
      logError(`upsertSchedule failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_UPDATE_SCHEDULE');
    }
  }

  // MENU OPERATIONS
  async createMenuCategory(vendorId, categoryData) {
    try {
      await this.repo.getVendorById(vendorId);
      return await this.repo.createMenuCategory(vendorId, categoryData);
    } catch (error) {
      logError(`createMenuCategory failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_CREATE_CATEGORY');
    }
  }

  async createFoodItem(vendorId, categoryId, itemData) {
    try {
      await this.repo.getVendorById(vendorId);
      return await this.repo.createFoodItem(vendorId, categoryId, itemData);
    } catch (error) {
      logError(`createFoodItem failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_CREATE_ITEM');
    }
  }

  // ORDER OPERATIONS
  async getVendorOrders(vendorId, pagination = {}, status = null) {
    try {
      await this.repo.getVendorById(vendorId);
      return await this.repo.getVendorOrders(vendorId, pagination, status);
    } catch (error) {
      logError(`getVendorOrders failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_FETCH_ORDERS');
    }
  }

  async updateOrderStatus(vendorId, orderId, status) {
    try {
      await this.repo.getVendorById(vendorId);

      // Validate status transition
      const validTransitions = {
        'PENDING': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['ON_THE_WAY', 'CANCELLED'],
        'ON_THE_WAY': ['DELIVERED']
      };

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true }
      });

      if (order && !validTransitions[order.status]?.includes(status)) {
        throw new Error('INVALID_STATUS_TRANSITION');
      }

      return await this.repo.updateOrderStatus(vendorId, orderId, status);
    } catch (error) {
      logError(`updateOrderStatus failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_UPDATE_ORDER');
    }
  }

  // ANALYTICS & REPORTS
  async getVendorAnalytics(vendorId, fromDate, toDate) {
    try {
      await this.repo.getVendorById(vendorId);
      return await this.repo.getVendorAnalytics(vendorId, fromDate, toDate);
    } catch (error) {
      logError(`getVendorAnalytics failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_FETCH_ANALYTICS');
    }
  }

  async getReviews(vendorId, pagination = {}) {
    try {
      await this.repo.getVendorById(vendorId);
      return await this.repo.getReviews(vendorId, pagination);
    } catch (error) {
      logError(`getReviews failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_FETCH_REVIEWS');
    }
  }

  async getActiveDeliveries(vendorId) {
    try {
      await this.repo.getVendorById(vendorId);
      return await this.repo.getActiveDeliveries(vendorId);
    } catch (error) {
      logError(`getActiveDeliveries failed: vendorId=${vendorId}`, { error: error.message });
      throw error instanceof Error ? error : new Error('FAILED_TO_FETCH_DELIVERIES');
    }
  }

  // CLEANUP
  async disconnect() {
    await this.repo.disconnect();
  }
}
