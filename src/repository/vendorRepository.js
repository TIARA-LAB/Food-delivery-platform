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
      const user = await prisma.user.findUnique({
        where: { id: vendorId },
        select: { 
          id: true, 
          email: true, 
          role: true,
          isActive: true 
        }
      });

      if (!user) {
        logError(`User not found: ${vendorId}`);
        throw new Error('VENDOR_NOT_FOUND');
      }

      if (user.role !== 'VENDOR' && user.role !== 2) {
        logError(`User not vendor: ${vendorId}, role: ${user.role}`);
        throw new Error('VENDOR_NOT_FOUND');
      }

      return {
        id: user.id,
        email: user.email,
        isActive: user.isActive ?? true
      };
    } catch (error) {
      logError(`getVendorById failed: vendorId=${vendorId}`, { error: error.message });
      throw error;
    }
  }

  async validateVendorRestaurant(vendorId, restaurantId) {
    const user = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { role: true }
    });

    if (!user || (user.role !== 'VENDOR' && user.role !== 2)) {
      logError(`Vendor access denied - invalid role: vendorId=${vendorId}`);
      throw new Error('UNAUTHORIZED_RESTAURANT_ACCESS');
    }

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

  // ✅ FIXED: ONLY Restaurant schema fields (name, description)
  async createRestaurant(vendorId, data) {
    try {
      this.validateInput(data, {
        name: { minLength: 2, maxLength: 100 },
        description: { minLength: 1, maxLength: 500 }
      });

      return await prisma.restaurant.create({
        data: {
          vendorId,
          name: data.name.trim(),
          description: data.description?.trim() || null
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
            include: {
              products: {
                where: { isAvailable: true, isActive: true },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  image: true,
                  isAvailable: true,
                  prepTimeMinutes: true
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
        description: { minLength: 1, maxLength: 500 }
      });

      return await prisma.restaurant.update({
        where: { vendorId },
        data: { 
          name: data.name?.trim(),
          description: data.description?.trim() || null
        },
        include: {
          menuCategories: {
            include: {
              products: {
                where: { isAvailable: true, isActive: true }
              }
            }
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
        prepTimeMinutes: { min: 1, max: 120 }
      });

      const category = await prisma.menuCategory.findFirst({
        where: {
          id: categoryId,
          restaurant: { vendorId }
        },
        select: { id: true }
      });

      if (!category) throw new Error('CATEGORY_NOT_FOUND');

      return await prisma.product.create({
        data: {
          categoryId,
          restaurantId: (await this.validateVendorRestaurant(vendorId)),
          name: data.name.trim(),
          description: data.description?.trim() || null,
          price: data.price,
          image: data.imageUrl || null,
          prepTimeMinutes: data.preparationTime || 15,
          isAvailable: true,
          isActive: true
        }
      });
    } catch (error) {
      logError(`createFoodItem failed: vendorId=${vendorId}`, { error: error.message });
      throw error;
    }
  }

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
              include: { product: true }
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
      logError(`updateOrderStatus failed:
  vendorId=${vendorId}, orderId=${orderId}, status=${status}`, { error: error.message });
      throw error;
    }
  }
}
