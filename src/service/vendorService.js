import { VendorRepository } from '../repository/vendorRepository.js';
import { logError } from '../utils/logger.js';

export class VendorService {
  constructor() {
    this.repo = new VendorRepository();
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
      
      // Throw original error for better debugging instead of generic message
      throw error instanceof Error ? error : new Error('FAILED_TO_CREATE_RESTAURANT');
    }
  }

  async getRestaurant(vendorId) {
    try {
      const restaurant = await this.repo.getVendorRestaurant(vendorId);
      if (!restaurant) {
        throw new Error('RESTAURANT_NOT_FOUND');  //  FIXED: was 'RESTAURANT_NOT_FAILED'
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
      throw error;  // Pass through original error
    }
  }

  async updateRestaurant(vendorId, updateData) {
    try {
      if (updateData.isActive && (!updateData.name || updateData.name.length < 2)) {
        throw new Error('RESTAURANT_NAME_REQUIRED');
      }

      return await this.repo.updateRestaurant(vendorId, updateData);
    } catch (error) {
      logError(`updateRestaurant failed: vendorId=${vendorId}`, { error: error.message });
      if (error.message.includes('access denied')) {
        throw new Error('UNAUTHORIZED_RESTAURANT_ACCESS');
      }
      throw error;  // Pass through original error
    }
  }

  async toggleRestaurantStatus(vendorId, isActive) {
    try {
      const newStatus = Boolean(isActive);

      if (!newStatus) {
        const activeOrders = await this.repo.getVendorOrders(vendorId, {}, ['CONFIRMED', 'ON_THE_WAY']);
        if (activeOrders.data.length > 0) {
          throw new Error('CANNOT_CLOSE_WITH_ACTIVE_ORDERS');
        }
      }

      return await this.repo.toggleRestaurantStatus(vendorId, newStatus);
    } catch (error) {
      logError(`toggleRestaurantStatus failed: vendorId=${vendorId}`, { error: error.message });
      throw error;
    }
  }

  // ... [all other methods follow same pattern - throw original error instead of generic]

  // UTILITY METHODS
  isRestaurantOpen(schedules) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const todaySchedule = schedules?.find(s => s.dayOfWeek === dayOfWeek);
    if (!todaySchedule) return false;

    const [h1, m1] = currentTime.split(':').map(Number);
    const [h2, m2] = todaySchedule.opensAt.split(':').map(Number);
    const [h3, m3] = todaySchedule.closesAt.split(':').map(Number);

    const currentMinutes = h1 * 60 + m1;
    const openMinutes = h2 * 60 + m2;
    const closeMinutes = h3 * 60 + m3;

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  async disconnect() {
    await this.repo.disconnect();
  }
}
