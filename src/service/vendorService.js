import { VendorRepository } from '../repository/vendorRepository.js';
import { AppError } from '../utils/error.js';

export class VendorService {
  constructor() {
    this.repo = new VendorRepository();
  }

  async getRestaurant(vendorId) {
    return await this.repo.getVendorRestaurant(vendorId);
  }

  async createRestaurant(vendorId, data) {
    return await this.repo.createRestaurant(vendorId, data);
  }

  async updateRestaurant(vendorId, data) {
    return await this.repo.updateRestaurant(vendorId, data);
  }

  async toggleRestaurantStatus(vendorId, isActive) {
    return await this.repo.toggleRestaurantStatus(vendorId, isActive);
  }

  async upsertSchedule(vendorId, scheduleData) {
    return await this.repo.upsertSchedule(vendorId, scheduleData);
  }

  async createMenuCategory(vendorId, data) {
    return await this.repo.createMenuCategory(vendorId, data);
  }

  async createFoodItem(vendorId, data) {
    return await this.repo.createFoodItem(vendorId, data);
  }

  async getVendorOrders(vendorId, pagination) {
    return await this.repo.getVendorOrders(vendorId, pagination);
  }

  async updateOrderStatus(vendorId, orderId, status) {
    return await this.repo.updateOrderStatus(vendorId, orderId, status);
  }

  async getVendorAnalytics(vendorId, fromDate, toDate) {
    return await this.repo.getVendorAnalytics(vendorId, fromDate, toDate);
  }

  async getReviews(vendorId, pagination) {
    return await this.repo.getReviews(vendorId, pagination);
  }

  async getActiveDeliveries(vendorId) {
    return await this.repo.getActiveDeliveries(vendorId);
  }
}
