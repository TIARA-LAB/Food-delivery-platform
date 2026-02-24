import prisma from '../config/db.js';
import { AppError } from '../utils/error.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export default class AdminRepository {
  async createSuperAdmin({ email, password, name }) {
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', isActive: true }
    });

    if (existingSuperAdmin) {
      throw new AppError('Super admin already exists', 409);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const apiKey = crypto.randomBytes(32).toString('hex');

    return prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'SUPER_ADMIN',
        apiKey,
        emailVerified: true,
        isActive: true,
        isPending: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        apiKey: true,
        createdAt: true
      }
    });
  }

  async createUser({ email, password, name, role }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const apiKey = (role === 'ADMIN' || role === 'SUPER_ADMIN') 
      ? crypto.randomBytes(32).toString('hex') 
      : null;

    return prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        apiKey,
        emailVerified: true,
        isActive: true,
        isPending: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        apiKey: role === 'ADMIN' || role === 'SUPER_ADMIN',
        createdAt: true
      }
    });
  }

  async findAdminByApiKey(adminApiKey) {
    if (!adminApiKey) return null;

    const admin = await prisma.user.findUnique({
      where: { 
        apiKey: adminApiKey,
        AND: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          isActive: true
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return admin || null;
  }

  async regenerateApiKey(userId) {
    const newApiKey = crypto.randomBytes(32).toString('hex');
    return prisma.user.update({
      where: { id: userId },
      data: { apiKey: newApiKey },
      select: { id: true, apiKey: true }
    });
  }

  async getDashboardStats() {
    const [totalCustomers, activeVendors, totalOrders, totalReviews, revenue] = 
      await Promise.all([
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.restaurant.count({ where: { isActive: true } }),
        prisma.order.count(),
        prisma.review.count(),
        prisma.order.aggregate({
          where: { status: 'DELIVERED' },
          _sum: { totalAmount: true },
          _avg: { totalAmount: true }
        })
      ]);

    return {
      totalCustomers,
      activeVendors,
      totalOrders,
      totalReviews,
      totalRevenue: revenue._sum?.totalAmount || 0,
      avgOrderValue: revenue._avg?.totalAmount || 0,
      commissionEarned: (revenue._sum?.totalAmount || 0) * 0.15
    };
  }

  async getUsers({ page = 1, limit = 10, role, isActive, isPending }) {
    const skip = (page - 1) * limit;
    const where = {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(isPending !== undefined && { isPending: isPending === 'true' })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
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

  async updateUserRole(userId, role) {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true }
    });
  }

  async getVendors({ page = 1, limit = 10, city, isActive }) {
    const skip = (page - 1) * limit;
    const where = {
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const [vendors, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: { 
            select: { id: true, email: true, name: true } 
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.restaurant.count({ where })
    ]);

    return { 
      data: vendors, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    };
  }

  async getCustomers({ page = 1, limit = 10, isActive, isPending }) {
    const skip = (page - 1) * limit;
    const where = { 
      role: 'CUSTOMER',
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(isPending !== undefined && { isPending: isPending === 'true' })
    };

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true
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
}
