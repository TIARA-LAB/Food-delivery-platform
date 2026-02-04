import { VendorRepository } from '../repository/vendorRepository.js'
import { logError } from '../utils/logger.js';

export class VendorService {
 constructor() {
  this.repo = new VendorRepository();
 }

 // RESTAURANT OPERATIONS

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
   throw new Error('FAILED_TO_FETCH_RESTAURANT');
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
   throw new Error('FAILED_TO_UPDATE_RESTAURANT');
  }
 }

 async toggleRestaurantStatus(vendorId, currentStatus) {
  try {
   const newStatus = !currentStatus;

   if (!newStatus) {
    const activeOrders = await this.repo.getVendorOrders(vendorId, {}, ['CONFIRMED', 'ON_THE_WAY']);
    if (activeOrders.data.length > 0) {
     throw new Error('CANNOT_CLOSE_WITH_ACTIVE_ORDERS');
    }
   }

   return await this.repo.toggleRestaurantStatus(vendorId, newStatus);
  } catch (error) {
   logError(`toggleRestaurantStatus failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_TOGGLE_STATUS');
  }
 }

 // OPERATING HOURS

 async upsertSchedule(vendorId, scheduleData) {
  try {
   if (scheduleData.opensAt >= scheduleData.closesAt) {
    throw new Error('OPENING_HOURS_MUST_PRECEDE_CLOSING');
   }
   return await this.repo.upsertSchedule(vendorId, scheduleData);
  } catch (error) {
   logError(`upsertSchedule failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_UPDATE_SCHEDULE');
  }
 }

 async createClosure(vendorId, closureData) {
  try {
   const restaurant = await this.repo.getVendorRestaurant(vendorId);
   const conflicts = restaurant?.closures?.some(closure =>
    this.datesOverlap(closure.startDate, closure.endDate, closureData.startDate, closureData.endDate)
   );

   if (conflicts) {
    throw new Error('CLOSURE_OVERLAPS_EXISTING');
   }
   return await this.repo.createClosure(vendorId, closureData);
  } catch (error) {
   logError(`createClosure failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_CREATE_CLOSURE');
  }
 }

 // MENU OPERATIONS 

 async createMenuCategory(vendorId, categoryData) {
  try {
   const restaurant = await this.repo.getVendorRestaurant(vendorId);
   if (restaurant.menuCategories.length >= 20) {
    throw new Error('MAX_CATEGORIES_REACHED');
   }
   return await this.repo.createMenuCategory(vendorId, categoryData);
  } catch (error) {
   logError(`createMenuCategory failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_CREATE_CATEGORY');
  }
 }

 async createFoodItem(vendorId, categoryId, itemData) {
  try {
   const restaurant = await this.repo.getVendorRestaurant(vendorId);
   const targetCategory = restaurant.menuCategories.find(cat => cat.id === categoryId);

   if (!targetCategory) {
    throw new Error('CATEGORY_NOT_FOUND');
   }
   if (targetCategory.items.length >= 100) {
    throw new Error('MAX_ITEMS_PER_CATEGORY_REACHED');
   }

   return await this.repo.createFoodItem(vendorId, categoryId, itemData);
  } catch (error) {
   logError(`createFoodItem failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_CREATE_ITEM');
  }
 }

 //ORDER MANAGEMENT

 async getOrders(vendorId, pagination = {}, status) {
  try {
   const result = await this.repo.getVendorOrders(vendorId, pagination, status);
   const ordersWithAge = result.data.map(order => ({
    ...order,
    ageMinutes: Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
   }));
   return { ...result, data: ordersWithAge };
  } catch (error) {
   logError(`getOrders failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_FETCH_ORDERS');
  }
 }

 async getOrderById(vendorId, orderId) {
  try {
   const recentOrders = await this.repo.getVendorOrders(vendorId, { limit: 50 });
   const order = recentOrders.data.find(o => o.id === orderId);

   if (!order) {
    throw new Error('ORDER_NOT_FOUND');
   }
   return order;
  } catch (error) {
   logError(`getOrderById failed: vendorId=${vendorId}, orderId=${orderId}`, { error: error.message });
   throw new Error('ORDER_NOT_FOUND');
  }
 }

 async updateOrderStatus(vendorId, orderId, newStatus) {
  try {
   const order = await this.getOrderById(vendorId, orderId);

   const validTransitions = {
    'PENDING': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['ON_THE_WAY', 'CANCELLED'],
    'ON_THE_WAY': ['DELIVERED']
   };

   if (!validTransitions[order.status]?.includes(newStatus)) {
    throw new Error('INVALID_STATUS_TRANSITION');
   }

   return await this.repo.updateOrderStatus(vendorId, orderId, newStatus);
  } catch (error) {
   logError(`updateOrderStatus failed: vendorId=${vendorId}, orderId=${orderId}`, { error: error.message });
   throw new Error('FAILED_TO_UPDATE_ORDER');
  }
 }

 //  PAYMENTS 
 async getOrderPayments(vendorId, orderId) {
  try {
   return await this.repo.getOrderPayments(vendorId, orderId);
  } catch (error) {
   logError(`getOrderPayments failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_FETCH_PAYMENTS');
  }
 }

 //  ANALYTICS
 async getAnalytics(vendorId, fromDate, toDate) {
  try {
   const analytics = await this.repo.getVendorAnalytics(vendorId, fromDate, toDate);
   return {
    ...analytics,
    conversionRate: analytics.totalOrders > 0
     ? Number((analytics.totalRevenue / analytics.totalOrders).toFixed(2))
     : 0,
    ordersPerDay: analytics.totalOrders / 30
   };
  } catch (error) {
   logError(`getAnalytics failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_FETCH_ANALYTICS');
  }
 }

 //REVIEWS 
 async getReviews(vendorId, pagination) {
  try {
   return await this.repo.getReviews(vendorId, pagination);
  } catch (error) {
   logError(`getReviews failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_FETCH_REVIEWS');
  }
 }

 // DELIVERIES
 async getActiveDeliveries(vendorId) {
  try {
   return await this.repo.getActiveDeliveries(vendorId);
  } catch (error) {
   logError(`getActiveDeliveries failed: vendorId=${vendorId}`, { error: error.message });
   throw new Error('FAILED_TO_FETCH_DELIVERIES');
  }
 }

 //UTILITY METHODS
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

 datesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
 }

 // Cleanup
 async disconnect() {
  await this.repo.disconnect();
 }
}
