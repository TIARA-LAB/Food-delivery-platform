import prisma from '../config/db.js';
import { logError, logInfo } from '../utils/logger.js';

export class VendorRepository {
  constructor() {}

  sanitizePagination(pagination = {}) {
    return {
      page: Math.max(1, Math.floor(pagination.page || 1)),
      limit: Math.min(50, Math.max(1, Math.floor(pagination.limit || 20)))
    };
  }

  async getVendorById(vendorId) {
    const user = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || user.role !== 'VENDOR' || !user.isActive) {
      throw new Error('VENDOR_NOT_FOUND');
    }

    return user;
  }

  async validateVendorRestaurant(vendorId) {
    const restaurant = await prisma.restaurant.findFirst({
      where: { vendorId, isActive: true },
      select: { id: true, vendorId: true }
    });

    if (!restaurant) {
      throw new Error('RESTAURANT_NOT_FOUND');
    }

    return restaurant.id;
  }

  async getVendorRestaurant(vendorId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { vendorId },
      include: {
        menuCategories: {
          select: { id: true, name: true, position: true, createdAt: true },
          orderBy: { position: 'asc' }
        },
        products: {
          where: { isAvailable: true, isActive: true },
          select: {
            id: true, name: true, description: true, price: true, image: true,
            images: true, prepTimeMinutes: true, stockQuantity: true, position: true
          },
          orderBy: { position: 'asc' }
        },
        schedules: true,
        closures: { where: { endDate: { gte: new Date() } } }
      }
    });

    if (!restaurant) {
      throw new Error('RESTAURANT_NOT_FOUND');
    }

    return {
      ...restaurant,
      menuWithProducts: this.groupMenuByPosition(restaurant.menuCategories, restaurant.products)
    };
  }

  groupMenuByPosition(categories, products) {
    const grouped = categories.map((category, index) => ({
      ...category,
      products: products.slice(index * 4, (index + 1) * 4)
    }));

    return grouped.length ? grouped : [{ id: 'uncategorized', name: 'All Items', products }];
  }

  async createRestaurant(vendorId, data) {
    const existing = await prisma.restaurant.findUnique({ where: { vendorId } });
    if (existing) {
      throw new Error('VENDOR_ALREADY_HAS_RESTAURANT');
    }

    return await prisma.restaurant.create({
      data: {
        vendorId,
        name: data.name.trim(),
        description: data.description?.trim() || null
      }
    });
  }

  async updateRestaurant(vendorId, data) {
    await this.validateVendorRestaurant(vendorId);
    
    return await prisma.restaurant.update({
      where: { vendorId },
      data: {
        name: data.name?.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive
      }
    });
  }

  async toggleRestaurantStatus(vendorId, isActive) {
    await this.validateVendorRestaurant(vendorId);
    
    const activeOrders = await prisma.order.count({
      where: {
        restaurant: { vendorId },
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'ON_THE_WAY'] }
      }
    });

    if (!isActive && activeOrders > 0) {
      throw new Error('CANNOT_CLOSE_WITH_ACTIVE_ORDERS');
    }

    return await prisma.restaurant.update({
      where: { vendorId },
      data: { isActive }
    });
  }

  async upsertSchedule(vendorId, scheduleData) {
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
  }

  async createMenuCategory(vendorId, data) {
    const restaurantId = await this.validateVendorRestaurant(vendorId);
    
    const categoryCount = await prisma.menuCategory.count({ where: { restaurantId } });
    if (categoryCount >= 20) {
      throw new Error('MAX_CATEGORIES_REACHED');
    }

    return await prisma.menuCategory.create({
      data: {
        restaurantId,
        name: data.name.trim(),
        position: data.position || 0
      }
    });
  }

  async createFoodItem(vendorId, data) {
    const restaurantId = await this.validateVendorRestaurant(vendorId);

    return await prisma.product.create({
      data: {
        restaurantId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: data.price,
        image: data.imageUrl || null,
        prepTimeMinutes: data.preparationTime || 15,
        position: data.position || 0,
        isAvailable: true,
        isActive: true
      }
    });
  }

  async getVendorOrders(vendorId, pagination) {
    const { page, limit } = this.sanitizePagination(pagination);
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: { restaurant: { vendorId } },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          address: { select: { label: true, city: true, street: true } },
      orderItems: { include: { product: true } },
          payment: true,
          delivery: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where: { restaurant: { vendorId } } })
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
      where: { id: orderId, restaurant: { vendorId } },
      data: { status }
    });

    if (result.count === 0) {
      throw new Error('ORDER_NOT_FOUND');
    }

    return { success: true, count: result.count };
  }

  async getVendorAnalytics(vendorId, fromDate, toDate) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgRating: 0,
      period: { fromDate, toDate }
    };
  }

  async getReviews(vendorId, pagination) {
    const { page, limit } = this.sanitizePagination(pagination);
    const skip = (page - 1) * limit;

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: { restaurantId: vendorId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({ where: { restaurantId: vendorId } })
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

  async getActiveDeliveries(vendorId) {
    return await prisma.delivery.findMany({
      where: {
        order: {
          restaurant: { vendorId },
          status: { notIn: ['DELIVERED', 'CANCELLED'] }
        }
      },
      include: {
        order: {
          include: {
            user: { select: { name: true, phone: true } },
            restaurant: { select: { name: true } }
          }
        }
      }
    });
  }
}
