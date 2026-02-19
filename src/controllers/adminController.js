import {
  getUsersSchema,
  updateUserRoleSchema,
  approveVendorSchema,
  getVendorsSchema,
  getCustomersSchema,
  analyticsSchema,
  paginationSchema,
  reviewSchema
} from '../validation/adminValidation.js'
import AdminService from '../service/adminService.js'
import { AppError } from '../utils/error.js';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

export default class AdminController {
  constructor() {
    this.service = new AdminService();
  }

  #handleError(res, error) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  //  Admin login 
  async adminLogin(req, res) {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        throw new AppError('API key required', 400);
      }

      // Verify admin API key from environment variables
      const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
      if (!ADMIN_API_KEY) {
        throw new AppError('Server configuration error', 500);
      }

      if (apiKey !== ADMIN_API_KEY) {
        throw new AppError('Invalid API key', 401);
      }

      //Create temporary admin user if doesn't exist
      let adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            email: `platform-admin-${Date.now()}@system.local`,
            role: 'ADMIN',
            isActive: true
          }
        });
      }

      // Generate JWT token with admin role
      const token = jwt.sign(
        { 
          id: adminUser.id, 
          role: adminUser.role,
          email: adminUser.email 
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '24h' }
      );

      res.status(200).json({ 
        status: 'success', 
        token,
        user: { 
          id: adminUser.id, 
          email: adminUser.email, 
          role: adminUser.role 
        } 
      });

    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async getUsers(req, res) {
    try {
      const validated = getUsersSchema.safeParse({ query: req.query });
      if (!validated.success) throw new AppError('Invalid query params', 400);
      const users = await this.service.getUsers(validated.data.query);
      res.status(200).json({ status: 'success', data: users });
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async updateUserRole(req, res) {
    try {
      const validated = updateUserRoleSchema.safeParse({
        params: req.params,
        body: req.body
      });
      if (!validated.success) throw new AppError('Invalid input', 400);
      const user = await this.service.updateUserRole(
        validated.data.params.id,
        validated.data.body.role
      );
      res.status(200).json({ status: 'success', data: user });
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async getVendors(req, res) {
    try {
      const validated = getVendorsSchema.safeParse({ query: req.query });
      if (!validated.success) throw new AppError('Invalid query params', 400);
      const vendors = await this.service.getVendors(validated.data.query);
      res.status(200).json({ status: 'success', data: vendors });
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async approveVendor(req, res) {
    try {
      const validated = approveVendorSchema.safeParse({ params: req.params });
      if (!validated.success) throw new AppError('Invalid vendor ID', 400);
      const vendor = await this.service.approveVendor(validated.data.params.id);
      res.status(200).json({ status: 'success', data: vendor });
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async dashboard(req, res) {
    try {
      const stats = await this.service.getDashboardStats();
      res.status(200).json({ status: 'success', data: stats });
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async getCustomers(req, res) {
    try {
      const validated = getCustomersSchema.safeParse({ query: req.query });
      if (!validated.success) throw new AppError('Invalid query parameters', 400);
      const customers = await this.service.getCustomers(validated.data.query);
      res.status(200).json({ status: 'success', data: customers });
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async getAnalytics(req, res) {
    try {
      const validated = analyticsSchema.safeParse({ query: req.query });
      if (!validated.success) throw new AppError('Invalid analytics query', 400);
      const analytics = await this.service.getAnalytics(validated.data.query);
      res.status(200).json({ status: 'success', data: analytics });
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async getVendorOrders(req, res) {
    try {
      const validated = paginationSchema.safeParse({ query: req.query });
      if (!validated.success) throw new AppError('Invalid pagination', 400);
      
      if (!req.params.vendorId) {
        throw new AppError('Vendor ID required', 400);
      }
      
      const [orders, total] = await Promise.all([
        this.service.getVendorOrders(req.params.vendorId, validated.data.query),
        this.service.getVendorOrdersCount(req.params.vendorId)
      ]);
      
      res.status(200).json({ 
        status: 'success', 
        data: orders,
        pagination: {
          page: validated.data.query.page || 1,
          limit: validated.data.query.limit || 10,
          total,
          pages: Math.ceil(total / (validated.data.query.limit || 10))
        }
      });
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  async getReviews(req, res) {
    try {
      const validated = reviewSchema.safeParse({ query: req.query });
      if (!validated.success) throw new AppError('Invalid review filters', 400);
      const reviews = await this.service.getReviews(validated.data.query);
      res.status(200).json({ status: 'success', data: reviews });
    } catch (error) {
      this.#handleError(res, error);
    }
  }
}
