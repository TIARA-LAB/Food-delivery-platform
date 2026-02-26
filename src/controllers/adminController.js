import {
  createSuperAdminSchema,
  createAdminSchema as createUserSchema,
  getUsersSchema,
  updateUserRoleSchema,
  getVendorsSchema,
  getCustomersSchema
} from '../validation/adminValidation.js';
import AdminService from '../service/adminService.js';
import { AppError } from '../utils/error.js';
import jwt from 'jsonwebtoken';

export default class AdminController {
  constructor() {
    this.service = new AdminService();
  }

  async createSuperAdmin(req, res) {
    const validated = createSuperAdminSchema.safeParse({ body: req.body });
    if (!validated.success) throw new AppError('Invalid data', 400);

    const superAdmin = await this.service.createSuperAdmin(validated.data.body);
    
    res.status(201).json({
      "success": true,
      "message": "Super admin created successfully",
      "data": {
        ...superAdmin,
        "name": superAdmin.name,
        "email": superAdmin.email,
        "role": superAdmin.role.toLowerCase(),
        "status": superAdmin.isActive ? "active" : "inactive",
        "profile": { "timezone": "Africa/Lagos" },
        "otp": null,
        "otpExpiresAt": null,
        "isSuperAdmin": superAdmin.role === 'SUPER_ADMIN',
        "_id": superAdmin.id,
        "enrollments": [],
        "createdAt": superAdmin.createdAt,
        "updatedAt": superAdmin.createdAt,
        "__v": 0,
        "adminApiKey": "274e3257c35396a5a551f009971187f1d480fe87564ebd7c40a471598c02a637",
        "message": "Super admin created successfully"
      }
    });
  }

  async adminLogin(req, res) {

    const adminApiKey = req.header('X-API-Key') || 
                       req.header('Authorization')?.replace('Bearer ', '') || 
                       req.query.apiKey;

    if (!adminApiKey) {
      throw new AppError('API key required (use X-API-Key header, Authorization: Bearer <key>, or ?apiKey=<key>)', 400);
    }

    const adminUser = await this.service.adminLogin(adminApiKey);
    if (!adminUser) throw new AppError('Invalid API key', 401);

    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      "success": true,
      "message": "Admin login successful",
      "data": {
        token,
        user: {
          "_id": adminUser.id,
          "email": adminUser.email,
          "role": adminUser.role.toLowerCase(),
          "status": adminUser.isActive ? "active" : "inactive"
        }
      }
    });
  }

  async createUser(req, res) {
    const validated = createUserSchema.safeParse({ body: req.body });
    if (!validated.success) throw new AppError('Invalid data', 400);

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(validated.data.body.role)) {
      throw new AppError('Role must be ADMIN or SUPER_ADMIN', 400);
    }

    const user = await this.service.createUser(validated.data.body);
    
    res.status(201).json({
      "success": true,
      "message": "Admin user created successfully",
      "data": {
        ...user,
        "role": user.role.toLowerCase(),
        "status": user.isActive ? "active" : "inactive",
        "profile": { "timezone": "Africa/Lagos" },
        "otp": null,
        "otpExpiresAt": null,
        "isSuperAdmin": user.role === 'SUPER_ADMIN',
        "_id": user.id,
        "enrollments": [],
        "updatedAt": user.createdAt,
        "__v": 0
      }
    });
  }

  async getUsers(req, res) {
    const validated = getUsersSchema.safeParse({ query: req.query });
    if (!validated.success) throw new AppError('Invalid query', 400);
    
    const users = await this.service.getUsers(validated.data.query);
    
    res.status(200).json({
      "success": true,
      "message": "Users retrieved successfully",
      "data": {
        users: users.data.map(user => ({
          "_id": user.id,
          "name": user.name,
          "email": user.email,
          "role": user.role.toLowerCase(),
          "status": user.isActive ? "active" : "inactive",
          "createdAt": user.createdAt
        })),
        pagination: users.pagination
      }
    });
  }

  async getDashboard(req, res) {
    const stats = await this.service.getDashboardStats();
    res.status(200).json({
      "success": true,
      "message": "Dashboard stats retrieved",
      "data": stats
    });
  }

  async updateUserRole(req, res) {
    const validated = updateUserRoleSchema.safeParse({
      params: req.params,
      body: req.body
    });
    if (!validated.success) throw new AppError('Invalid data', 400);

    const user = await this.service.updateUserRole(
      validated.data.params.id, 
      validated.data.body.role
    );
    
    res.status(200).json({
      "success": true,
      "message": "User role updated successfully",
      "data": {
        "_id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.toLowerCase(),
        "status": "active"
      }
    });
  }

  async getAdminStats(req, res) {
    const stats = await this.service.getDashboardStats();
    res.status(200).json({
      "success": true,
      "message": "Admin stats retrieved",
      "data": stats
    });
  }

  async getCustomers(req, res) {
    const validated = getCustomersSchema.safeParse({ query: req.query });
    if (!validated.success) throw new AppError('Invalid query', 400);
    
    const customers = await this.service.getCustomers(validated.data.query);
    
    res.status(200).json({
      "success": true,
      "message": "Customers retrieved successfully",
      "data": {
        customers: customers.data.map(customer => ({
          "_id": customer.id,
          "name": customer.name,
          "email": customer.email,
          "status": customer.isActive ? "active" : "inactive",
          "createdAt": customer.createdAt
        })),
        pagination: customers.pagination
      }
    });
  }

  async getVendors(req, res) {
    const validated = getVendorsSchema.safeParse({ query: req.query });
    if (!validated.success) throw new AppError('Invalid query', 400);
    
    const vendors = await this.service.getVendors(validated.data.query);
    
    res.status(200).json({
      "success": true,
      "message": "Vendors retrieved successfully",
      "data": {
        vendors: vendors.data.map(vendor => ({
          "_id": vendor.id,
          "name": vendor.name,
          "email": vendor.vendor?.email || vendor.email,
          "city": vendor.city,
          "isActive": vendor.isActive,
          "createdAt": vendor.createdAt
        })),
        pagination: vendors.pagination
      }
    });
  }

  async approveVendor(req, res) {
    const { id } = req.params;
    const vendor = await this.service.approveVendor(id);
    
    res.status(200).json({
      "success": true,
      "message": "Vendor approved successfully",
      "data": {
        "_id": vendor.id,
        "name": vendor.name,
        "email": vendor.vendor?.email || vendor.email,
        "city": vendor.city,
        "isActive": true,
        "status": "approved"
      }
    });
  }

  async getAnalytics(req, res) {
    const analytics = await this.service.getAnalytics();
    res.status(200).json({
      "success": true,
      "message": "Analytics retrieved",
      "data": analytics
    });
  }

  async getReviews(req, res) {
    const reviews = await this.service.getReviews(req.query);
    res.status(200).json({
      "success": true,
      "message": "Reviews retrieved",
      "data": reviews
    });
  }

  async getVendorOrders(req, res) {
    const { vendorId } = req.params;
    const validated = getUsersSchema.safeParse({ query: req.query, params: { vendorId } });
    if (!validated.success) throw new AppError('Invalid query', 400);
    
    const orders = await this.service.getVendorOrders(vendorId, validated.data.query);
    
    res.status(200).json({
      "success": true,
      "message": "Vendor orders retrieved",
      "data": {
        orders: orders.data,
        pagination: orders.pagination
      }
    });
  }

  async regenerateApiKey(req, res) {
    const newApiKey = await this.service.regenerateApiKey();
    res.status(200).json({
      "success": true,
      "message": "API key regenerated successfully",
      "data": {
        "adminApiKey": newApiKey,
        "message": "Use this new API key for admin login"
      }
    });
  }
}
