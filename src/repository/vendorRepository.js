import prisma from '../config/db.js';
import { logError } from '../utils/logger.js';

export class VendorRepository {
  constructor() {}

  sanitizePagination(pagination = {}) {
    return {
      page: Math.max(1, Math.floor(pagination.page || 1)),
      limit: Math.min(50, Math.max(1, Math.floor(pagination.limit || 20)))
    };
  }

  validateTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return false;
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

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
  async createRestaurant(vendorId, data) {
    try {
      this.validateInput(data, {
        name: { minLength: 2, maxLength: 100 },
        description: { maxLength: 500 },
        phone: { minLength: 10, maxLength: 20 },
        deliveryRadius: { min: 1, max: 50 },
        deliveryFee: { min: 0 }
      });

      return await prisma.restaurant.create({
        data: {
          vendorId,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          phone: data.phone?.trim() || null,
          address: data.address?.trim(),
          city: data.city?.trim(),
          cuisine: data.cuisine?.trim(),
          deliveryRadius: data.deliveryRadius,
          deliveryFee: data.deliveryFee,
          isActive: false
        },
        include: {
          vendor: { select: { id: true, email: true } }
        }
      });
    } catch (error) {
      logError(`createRestaurant failed: vendorId=${vendorId}`, { error: error.message });
      throw error;
    }
  }

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
                  isAvailable: true,
                  preparationTime: true
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

  // SCHEDULE OPERATIONS
  async upsertSchedule(vendorId, scheduleData) {
    try {
      if (scheduleData.dayOfWeek < 0 || scheduleData.dayOfWeek > 6) {
        throw new Error('INVALID_DAY_OF_WEEK');
      }
      if (!this.validateTime(scheduleData.opensAt)) {
        throw new Error('INVALID_TIME_FORMAT');
      }
      if (!this.validateTime(scheduleData.closesAt)) {
        throw new Error('INVALID_TIME_FORMAT');
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

  // MENU OPERATIONS
  async createMenuCategory(vendorId, data) {
    try {
      this.validateInput(data, { name: { minLength: 2, maxLength: 50 } });
      const restaurantId = await this.validateVendorRestaurant(vendorId);

      return await prisma.menuCategory.create({
        data: {
          restaurantId,
          name: data.name.trim(),
          description: data.description?.trim() || null
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
        price: { min: 0.01, max: 10000 },
        preparationTime: { min: 1, max: 120 }
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
          name: data.name.trim(),
          description: data.description?.trim() || null,
          price: data.price,
          imageUrl: data.imageUrl || null,
          preparationTime: data.preparationTime || 15,
          isAvailable: true
        }
      });
    } catch (error) {
      logError(`createFoodItem failed: vendorId=${vendorId}`, { error: error.message });
      throw error;
    }
  }

  // ORDER OPERATIONS
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

  // ANALYTICS, REVIEWS, DELIVERIES (as implemented previously)
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

  async disconnect() {
    await prisma.$disconnect();
  }
}
