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
      phone: data.phone
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
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    };
  }

  async getRestaurants(query = {}) {
    const { page = 1, limit = 10, city, cuisine, rating } = query;
    const skip = (page - 1) * Number(limit);

    const where = { isActive: true };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (cuisine) where.cuisine = { contains: cuisine, mode: 'insensitive' };
    if (rating) where.rating = { gte: Number(rating) };

    const result = await this.repo.findRestaurants({ skip, take: Number(limit), where });

    return {
      restaurants: result.restaurants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        pages: Math.ceil(result.total / Number(limit))
      }
    };
  }

  async getRestaurantMenu(restaurantId) {
    const restaurant = await this.repo.findRestaurantMenu(restaurantId);
    if (!restaurant?.isActive) throw new AppError('Restaurant not found or inactive', 404);

    return {
      id: restaurant.id,
      name: restaurant.name,
      phone: restaurant.phone || null,
      rating: restaurant.rating || 0,
      city: restaurant.city,
      cuisine: restaurant.cuisine,
      menu: restaurant.menuCategories?.map(cat => ({
        id: cat.id,
        name: cat.name,
        items: cat.items || []
      })) || []
    };
  }

  async addToCart(customerId, data) {
    logInfo('Adding item to cart', { customerId, foodId: data.foodId });
    const result = await this.repo.addToCart(customerId, data.foodId, Number(data.quantity));
    return { success: true, message: 'Item added to cart successfully', data: result };
  }

  // Get cart
  async getCart(customerId) {
    logInfo('Fetching cart', { customerId });
    const cartItems = await this.repo.getCart(customerId);
    
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.food.price * item.quantity), 0);

    return {
      items: cartItems,
      summary: {
        totalItems,
        totalAmount
      }
    };
  }

  async createOrder(customerId, data) {
    logInfo('Creating order', { customerId, restaurantId: data.restaurantId });
    const order = await this.repo.createOrder(customerId, data);
    return { success: true, message: 'Order placed successfully', data: order };
  }

  async getOrders(customerId, query) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * Number(limit);

    const result = await this.repo.getCustomerOrders(customerId, { skip, take: Number(limit) });
    return {
      orders: result.orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        pages: Math.ceil(result.total / Number(limit))
      }
    };
  }
}
