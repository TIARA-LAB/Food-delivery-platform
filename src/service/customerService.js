import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error.js';
import { logInfo, logError } from '../utils/logger.js';
import { CustomerRepository } from '../repository/customerRepository.js';

export class CustomerService {
  constructor() {
    this.repo = new CustomerRepository();
  }

  async register(data) {
    logInfo('Customer registration attempt', { email: data.email });
    
    const existing = await this.repo.findByEmail(data.email);
    if (existing) throw new AppError('Email already registered', 409);

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const customer = await this.repo.createCustomer({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone || null
    });

    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: 'CUSTOMER' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logInfo('Customer registered successfully', { customerId: customer.id });
    return { user: customer, token };
  }

  async login(data) {
    logInfo('Customer login attempt', { email: data.email });
    
    const user = await this.repo.findByEmail(data.email);
    if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) throw new AppError('Invalid credentials', 401);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logInfo('Customer logged in successfully', { customerId: user.id });
    return {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      token
    };
  }

  async getRestaurants(query = {}) {
    const params = {
      page: Number(query.page) || 1,
      limit: Math.min(50, Math.max(1, Number(query.limit) || 10)),
      city: query.city?.trim(),
      cuisine: query.cuisine?.trim(),
      search: query.search?.trim(),
      rating: query.rating
    };

    const skip = Math.max(0, (params.page - 1) * params.limit);

    const where = {};
    if (params.city) where.city = params.city;
    if (params.cuisine) where.cuisine = params.cuisine;
    if (params.search) where.search = params.search;
    if (params.rating) where.rating = params.rating;

    console.log('🔍 getRestaurants params:', params);

    const result = await this.repo.findRestaurants({ 
      skip, 
      take: params.limit, 
      where 
    });

    return {
      success: true,
      data: result.data,
      meta: {
        ...result.meta,
        total: result.total,
        pages: Math.ceil(result.total / params.limit)
      }
    };
  }

  async getRestaurantMenu(restaurantId) {
    if (!restaurantId) throw new AppError('Restaurant ID required', 400);
    
    const restaurant = await this.repo.findRestaurantMenu(restaurantId);
    if (!restaurant?.isActive) {
      throw new AppError('Restaurant not found or inactive', 404);
    }

    return {
      success: true,
      data: {
        id: restaurant.id,
        name: restaurant.name,
        phone: restaurant.phone || null,
        rating: restaurant.averageRating || 0,
        city: restaurant.city,
        menu: restaurant.menuCategories?.map(cat => ({
          id: cat.id,
          name: cat.name,
          items: cat.products || []  
        })) || []
      }
    };
  }

  //userId + productId (matches schema)
  async addToCart(userId, data) {
    if (!data.productId || !data.quantity) {
      throw new AppError('Product ID and quantity required', 400);
    }

    logInfo('Adding item to cart', { 
      userId, 
      productId: data.productId, 
      quantity: data.quantity 
    });
    
    const result = await this.repo.addToCart(
      userId,           // ← FIXED: was customerId
      data.productId,   // ← FIXED: was foodId
      Number(data.quantity)
    );
    
    return { 
      success: true, 
      message: 'Item added to cart successfully', 
      data: result 
    };
  }

  // userId
  async getCart(userId) {
    logInfo('Fetching cart', { userId });
    const cartItems = await this.repo.getCart(userId);
    
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0  
    );

    return {
      success: true,
      data: {
        items: cartItems,
        summary: {
          totalItems,
          totalAmount: Number(totalAmount.toFixed(2))
        }
      }
    };
  }

  // userId
  async createOrder(userId, data) {
    logInfo('Creating order', { userId, restaurantId: data.restaurantId });
    const order = await this.repo.createOrder(userId, data); 
    
    return { 
      success: true, 
      message: 'Order placed successfully', 
      data: order 
    };
  }

  // userId
  async getOrders(userId, query) {
    const params = {
      page: Number(query.page) || 1,
      limit: Math.min(50, Math.max(1, Number(query.limit) || 10))
    };
    
    const skip = Math.max(0, (params.page - 1) * params.limit);

    const result = await this.repo.getCustomerOrders(userId, {  
      skip, 
      take: params.limit 
    });

    return {
      success: true,
      data: result.data,
      meta: {
        page: params.page,
        limit: params.limit,
        total: result.total,
        pages: Math.ceil(result.total / params.limit)
      }
    };
  }
}
