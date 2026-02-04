import prisma from '../config/db.js';
import { logError } from '../utils/logger.js'



export class VendorRepository {

 async validateVendorRestaurant(vendorId, restaurantId) {
  const restaurant = await prisma.restaurant.findFirst({
   where: {
    vendorId,
    isActive: true,
    ...(restaurantId && { id: restaurantId })
   },
   select: { id: true, vendorId: true }
  });

  if (!restaurant || restaurant.vendorId !== vendorId) {
   logError(`Vendor access denied: vendorId=${vendorId}, restaurantId=${restaurantId}`);
   throw new Error('Restaurant not found or access denied');
  }
  return restaurant.id;
 }

 // SANITIZE PAGINATION
 sanitizePagination(pagination = {}) {
  return {
   page: Math.max(1, Math.floor(pagination.page || 1)),
   limit: Math.min(50, Math.max(1, Math.floor(pagination.limit || 20)))
  };
 }

 // VALIDATE TIME
 validateTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
 }

 // VALIDATION 
 validateInput(data, rules) {
  for (const [field, validators] of Object.entries(rules)) {
   if (data[field] !== undefined && data[field] !== null) {
    if (validators.min !== undefined && data[field] < validators.min) {
     throw new Error(`${field} must be at least ${validators.min}`);
    }
    if (validators.max !== undefined && data[field] > validators.max) {
     throw new Error(`${field} must be at most ${validators.max}`);
    }
    if (validators.minLength !== undefined && data[field].length < validators.minLength) {
     throw new Error(`${field} must be at least ${validators.minLength} characters`);
    }
   }
  }
 }

 // RESTAURANT OPERATIONS
 async getVendorRestaurant(vendorId) {
  return prisma.restaurant.findUnique({
   where: { vendorId },
   include: {
    menuCategories: {
     where: { items: { some: { isAvailable: true } } },
     include: { items: { where: { isAvailable: true } } }
    },
    schedules: true,
    closures: { where: { endDate: { gte: new Date() } } }
   }
  });
 }

 async updateRestaurant(vendorId, data) {
  await this.validateVendorRestaurant(vendorId);

  this.validateInput(data, {
   name: { minLength: 2, maxLength: 100 },
   description: { maxLength: 500 }
  });

  return prisma.restaurant.update({
   where: { vendorId },
   data: { ...data, updatedAt: new Date() },
   include: {
    menuCategories: {
     where: { items: { some: { isAvailable: true } } },
     include: { items: true }
    }
   }
  });
 }

 async toggleRestaurantStatus(vendorId, isActive) {
  await this.validateVendorRestaurant(vendorId);
  return prisma.restaurant.update({
   where: { vendorId },
   data: { isActive }
  });
 }

 // SCHEDULE & CLOSURES
 async upsertSchedule(vendorId, scheduleData) {
  if (scheduleData.dayOfWeek < 0 || scheduleData.dayOfWeek > 6) {
   throw new Error('dayOfWeek must be 0-6 (Sunday-Saturday)');
  }
  if (!this.validateTime(scheduleData.opensAt)) {
   throw new Error('opensAt must be valid time format (HH:MM)');
  }
  if (!this.validateTime(scheduleData.closesAt)) {
   throw new Error('closesAt must be valid time format (HH:MM)');
  }

  const restaurantId = await this.validateVendorRestaurant(vendorId);

  return prisma.restaurantSchedule.upsert({
   where: {
    restaurantId_dayOfWeek: {
     restaurantId,
     dayOfWeek: scheduleData.dayOfWeek
    }
   },
   update: scheduleData,
   create: {
    restaurantId,
    ...scheduleData
   }
  });
 }

 async createClosure(vendorId, closureData) {
  if (closureData.startDate >= closureData.endDate) {
   throw new Error('startDate must be before endDate');
  }

  const restaurantId = await this.validateVendorRestaurant(vendorId);

  return prisma.restaurantClosure.create({
   data: {
    restaurantId,
    ...closureData
   }
  });
 }

 // MENU MANAGEMENT
 async createMenuCategory(vendorId, data) {
  this.validateInput(data, { name: { minLength: 2, maxLength: 50 } });
  const restaurantId = await this.validateVendorRestaurant(vendorId);

  return prisma.menuCategory.create({
   data: {
    restaurantId,
    ...data
   }
  });
 }

 async createFoodItem(vendorId, categoryId, data) {
  this.validateInput(data, {
   name: { minLength: 2, maxLength: 100 },
   price: { min: 0.01, max: 10000 }
  });

  const category = await prisma.menuCategory.findFirst({
   where: {
    id: categoryId,
    restaurant: { vendorId }
   },
   select: { id: true }
  });

  if (!category) throw new Error('Category not found or access denied');

  return prisma.foodItem.create({
   data: {
    categoryId,
    ...data,
    isAvailable: true
   }
  });
 }

 async updateFoodItem(vendorId, foodId, data) {
  const validationRules = {};
  if (data.name !== undefined) validationRules.name = { minLength: 2, maxLength: 100 };
  if (data.price !== undefined) validationRules.price = { min: 0.01, max: 10000 };

  this.validateInput(data, validationRules);

  const foodItem = await prisma.foodItem.findFirst({
   where: {
    id: foodId,
    category: {
     restaurant: { vendorId }
    }
   },
   select: { id: true }
  });

  if (!foodItem) throw new Error('Food item not found or access denied');

  return prisma.foodItem.update({
   where: { id: foodId },
   data
  });
 }

 // ORDER MANAGEMENT
 async getVendorOrders(vendorId, pagination = {}, status) {
  const { page, limit } = this.sanitizePagination(pagination);
  const skip = (page - 1) * limit;

  const [orders, totalCount] = await Promise.all([
   prisma.order.findMany({
    where: {
     restaurant: { vendorId },
     ...(status && { status: { in: status } })
    },
    include: {
     user: { select: { id: true, name: true, phone: true } },
     address: {
      select: { label: true, city: true, street: true, latitude: true, longitude: true }
     },
     items: {
      include: { food: true }
     },
     payment: true,
     delivery: true
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
   }),
   prisma.order.count({
    where: {
     restaurant: { vendorId },
     ...(status && { status: { in: status } })
    }
   })
  ]);

  return {
   data: orders,
   pagination: {
    page,
    limit,
    total: totalCount,
    totalPages: Math.ceil(totalCount / limit),
    hasNext: page < Math.ceil(totalCount / limit),
    hasPrev: page > 1
   }
  };
 }

 async updateOrderStatus(vendorId, orderId, status) {
  const result = await prisma.order.updateMany({
   where: {
    id: orderId,
    restaurant: { vendorId }
   },
   data: { status }
  });

  if (result.count === 0) {
   throw new Error('Order not found or access denied');
  }

  return { success: true, count: result.count };
 }

 // PAYMENT TRACKING 
 async getOrderPayments(vendorId, orderId) {
  return prisma.payment.findMany({
   where: {
    order: {
     restaurant: { vendorId },
     ...(orderId && { id: orderId })
    }
   },
   include: {
    order: {
     select: { id: true, totalAmount: true, status: true }
    }
   },
   orderBy: { createdAt: 'desc' }
  });
 }

 // ANALYTICS 
 async getVendorAnalytics(vendorId, fromDate, toDate) {
  const restaurantId = await this.validateVendorRestaurant(vendorId);

  const [totalOrders, totalRevenue, avgRating] = await Promise.all([
   prisma.order.count({
    where: {
     restaurantId,
     createdAt: {
      ...(fromDate && { gte: fromDate }),
      ...(toDate && { lte: toDate })
     }
    }
   }),
   prisma.order.aggregate({
    where: {
     restaurantId,
     payment: { status: 'PAID' }
    },
    _sum: { totalAmount: true }
   }),
   prisma.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true }
   })
  ]);

  return {
   totalOrders,
   totalRevenue: totalRevenue._sum?.totalAmount || 0,
   avgRating: avgRating._avg?.rating || 0
  };
 }

 // REVIEWS 
 async getReviews(vendorId, pagination) {
  const { page, limit } = this.sanitizePagination(pagination);
  const skip = (page - 1) * limit;

  const [reviews, totalCount] = await Promise.all([
   prisma.review.findMany({
    where: {
     restaurant: { vendorId }
    },
    include: {
     user: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
   }),
   prisma.review.count({
    where: {
     restaurant: { vendorId }
    }
   })
  ]);

  return {
   data: reviews,
   pagination: {
    page,
    limit,
    total: totalCount,
    totalPages: Math.ceil(totalCount / limit)
   }
  };
 }

 // DELIVERY TRACKING 
 async getActiveDeliveries(vendorId) {
  return prisma.delivery.findMany({
   where: {
    order: {
     restaurant: { vendorId },
     status: { in: ['CONFIRMED', 'ON_THE_WAY'] }
    }
   },
   include: {
    order: {
     select: { id: true, totalAmount: true },
     include: { user: { select: { name: true, phone: true } } }
    },
    rider: { select: { name: true, phone: true } }
   },
   orderBy: { createdAt: 'desc' }
  });
 }

 // CLEANUP 
 async disconnect() {
  await prisma.$disconnect();
 }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
 console.log('SIGTERM received - disconnecting Prisma');
 await prisma.$disconnect();
});
