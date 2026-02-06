import prisma from '../config/db.js';
import { logError } from '../utils/logger.js';

export class VendorRepository {
 constructor() { }

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

 // VALIDATE INPUT
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
 async getVendorById(vendorId) {
  try {
   const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, email: true, isActive: true }
   });
   return vendor;
  } catch (error) {
   logError(`getVendorById failed: vendorId=${vendorId}`, { error: error.message });
   return null;
  }
 }

 // VALIDATE VENDOR RESTAURANT ACCESS
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

 // RESTAURANT OPERATIONS
 async getVendorRestaurant(vendorId) {
  try {
   return await prisma.restaurant.findUnique({
    where: { vendorId },
    include: {
     menuCategories: {
      where: { items: { some: { isAvailable: true } } },
      include: {
       items: {
        where: { isAvailable: true },
        select: {
         id: true,
         name: true,
         description: true,
         price: true,
         imageUrl: true,
         isAvailable: true
        }
       }
      }
     },
     schedules: true,
     closures: { where: { endDate: { gte: new Date() } } }
    }
   });
  } catch (error) {
   logError(`getVendorRestaurant failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 async updateRestaurant(vendorId, data) {
  try {
   await this.validateVendorRestaurant(vendorId);

   this.validateInput(data, {
    name: { minLength: 2, maxLength: 100 },
    description: { maxLength: 500 },
    phone: { minLength: 10, maxLength: 20 }
   });

   return await prisma.restaurant.update({
    where: { vendorId },
    data: { ...data, updatedAt: new Date() },
    include: {
     menuCategories: {
      where: { items: { some: { isAvailable: true } } },
      include: { items: true }
     }
    }
   });
  } catch (error) {
   logError(`updateRestaurant failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 async toggleRestaurantStatus(vendorId, isActive) {
  try {
   await this.validateVendorRestaurant(vendorId);
   return await prisma.restaurant.update({
    where: { vendorId },
    data: { isActive }
   });
  } catch (error) {
   logError(`toggleRestaurantStatus failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 // SCHEDULE & CLOSURES
 async upsertSchedule(vendorId, scheduleData) {
  try {
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

   return await prisma.restaurantSchedule.upsert({
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
  } catch (error) {
   logError(`upsertSchedule failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 async createClosure(vendorId, closureData) {
  try {
   if (closureData.startDate >= closureData.endDate) {
    throw new Error('startDate must be before endDate');
   }

   const restaurantId = await this.validateVendorRestaurant(vendorId);

   return await prisma.restaurantClosure.create({
    data: {
     restaurantId,
     ...closureData
    }
   });
  } catch (error) {
   logError(`createClosure failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 // MENU MANAGEMENT
 async createMenuCategory(vendorId, data) {
  try {
   this.validateInput(data, { name: { minLength: 2, maxLength: 50 } });
   const restaurantId = await this.validateVendorRestaurant(vendorId);

   return await prisma.menuCategory.create({
    data: {
     restaurantId,
     ...data
    }
   });
  } catch (error) {
   logError(`createMenuCategory failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 async createFoodItem(vendorId, categoryId, data) {
  try {
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

   if (!category) throw new Error('CATEGORY_NOT_FOUND');

   return await prisma.foodItem.create({
    data: {
     categoryId,
     ...data,
     isAvailable: true
    }
   });
  } catch (error) {
   logError(`createFoodItem failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 async updateFoodItem(vendorId, foodId, data) {
  try {
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

   return await prisma.foodItem.update({
    where: { id: foodId },
    data
   });
  } catch (error) {
   logError(`updateFoodItem failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 async getOrderById(vendorId, orderId) {
  try {
   const order = await prisma.order.findFirst({
    where: {
     id: orderId,
     restaurant: { vendorId }
    },
    select: { id: true, status: true }
   });
   return order;
  } catch (error) {
   logError(`getOrderById failed: vendorId=${vendorId}, orderId=${orderId}`, { error: error.message });
   return null;
  }
 }

 // ORDER MANAGEMENT
 async getVendorOrders(vendorId, pagination = {}, status) {
  try {
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
  } catch (error) {
   logError(`getVendorOrders failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 async updateOrderStatus(vendorId, orderId, status) {
  try {
   const result = await prisma.order.updateMany({
    where: {
     id: orderId,
     restaurant: { vendorId }
    },
    data: { status }
   });

   if (result.count === 0) {
    throw new Error('ORDER_NOT_FOUND');
   }

   return { success: true, count: result.count };
  } catch (error) {
   logError(`updateOrderStatus failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 // PAYMENT TRACKING 
 async getOrderPayments(vendorId, orderId) {
  try {
   return await prisma.payment.findMany({
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
  } catch (error) {
   logError(`getOrderPayments failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 // ANALYTICS 
 async getVendorAnalytics(vendorId, fromDate, toDate) {
  try {
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
  } catch (error) {
   logError(`getVendorAnalytics failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 // REVIEWS 
 async getReviews(vendorId, pagination) {
  try {
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
  } catch (error) {
   logError(`getReviews failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
 }

 // DELIVERY TRACKING 
 async getActiveDeliveries(vendorId) {
  try {
   return await prisma.delivery.findMany({
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
  } catch (error) {
   logError(`getActiveDeliveries failed: vendorId=${vendorId}`, { error: error.message });
   throw error;
  }
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
