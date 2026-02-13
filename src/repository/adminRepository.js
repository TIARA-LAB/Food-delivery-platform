// AdminRepository.js - COMPLETE CORRECTED FILE
import prisma from '../config/db.js';

export default class AdminRepository {
  async getDashboardStats() {
    try {
      const totalCustomers = await prisma.user.count({ 
        where: { role: { equals: 'CUSTOMER' } } 
      });
      
      const activeVendors = await prisma.restaurant.count({ 
        where: { isActive: true } 
      });
      
      const totalOrders = await prisma.order.count({ 
        where: { status: { equals: 'DELIVERED' } } 
      });
      
      const totalReviews = await prisma.review.count();
      
      const revenue = await prisma.order.aggregate({ 
        where: { status: { equals: 'DELIVERED' } },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true }
      });

      return {
        totalCustomers,
        activeVendors,
        totalOrders,
        totalReviews,
        totalRevenue: revenue._sum.totalAmount || 0,
        avgOrderValue: revenue._avg.totalAmount || 0,
        commissionEarned: (revenue._sum.totalAmount || 0) * 0.15
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      throw error;
    }
  }

  async getAnalytics({ period, startDate, endDate }) {
    try {
      const where = { status: 'DELIVERED' };
      if (startDate && endDate) {
        where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
      }

      const [ordersByVendor, topOrderItems] = await Promise.all([
        prisma.restaurant.findMany({
          where: { orders: { some: where } },
          include: { 
            _count: { select: { orders: true } }
          }
        }),
        prisma.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: { status: 'DELIVERED' }
          },
          _count: { id: true },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: 10
        })
      ]);

      const topProductIds = topOrderItems.map(item => item.productId);
      const topProducts = topProductIds.length > 0 ? await prisma.product.findMany({
        where: { 
          id: { in: topProductIds.slice(0, 10) }
        },
        select: { 
          id: true, 
          name: true, 
          price: true,
          restaurant: {
            select: { name: true }
          }
        }
      }) : [];

      return { 
        ordersByVendor, 
        topProducts: topProducts.map(product => ({
          ...product,
          orderCount: topOrderItems.find(item => item.productId === product.id)?._count.id || 0
        }))
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return { ordersByVendor: [], topProducts: [] };
    }
  }

  async getUsers({ page = 1, limit = 10, role }) {
    const skip = (page - 1) * limit;
    const where = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return { 
      data: users, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    };
  }

  async getVendors({ page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;

    const [vendors, total] = await Promise.all([
      prisma.restaurant.findMany({
        skip,
        take: limit,
        include: {
          vendor: { select: { email: true, name: true } },
          _count: { select: { products: true, orders: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.restaurant.count()
    ]);

    return { 
      data: vendors, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    };
  }

  async approveVendor(restaurantId) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isActive: true }
    });
  }

  async updateUserRole(userId, role) {
    return prisma.user.update({
      where: { id: userId },
      data: { role }
    });
  }

  async getCustomers({ page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;
    const where = { role: 'CUSTOMER' };

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { orders: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return { 
      data: customers, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    };
  }

  // ✅ FIXED: Changed 'customer' to 'user' + Added pagination count
  async getVendorOrders(vendorId, { page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;
    return prisma.order.findMany({
      where: { restaurantId: vendorId },
      skip,
      take: limit,
      include: {
        user: { 
          select: { name: true, phone: true }  // ✅ FIXED: Use 'user' not 'customer'
        },
        restaurant: { 
          select: { name: true } 
        },
        orderItems: true,
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getVendorOrdersCount(vendorId) {
    return prisma.order.count({ 
      where: { restaurantId: vendorId } 
    });
  }

  async getReviews({ page = 1, limit = 10, vendorId, status }) {
    const skip = (page - 1) * limit;
    const where = {};
    if (vendorId) where.restaurantId = vendorId;
    if (status) where.status = status;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { name: true } },  // ✅ Uses correct 'user' field
          restaurant: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.review.count({ where })
    ]);

    return { 
      data: reviews, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    };
  }
}
