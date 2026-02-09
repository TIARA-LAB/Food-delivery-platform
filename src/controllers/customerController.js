import { CustomerService } from '../service/customerService.js';

const customerService = new CustomerService();

export const register = async (req, res, next) => {
  try {
    const result = await customerService.register(req.validatedData);
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await customerService.login(req.validatedData);
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ✅ PUBLIC - NO AUTH
export const getRestaurants = async (req, res, next) => {
  try {
    const restaurants = await customerService.getRestaurants(req.query);
    res.json({ success: true, data: restaurants });
  } catch (error) {
    next(error);
  }
};

// ✅ PUBLIC - NO AUTH (FIXED - removed extra semicolon)
export const getRestaurantMenu = async (req, res, next) => {
  try {
    const menu = await customerService.getRestaurantMenu(req.params.id);
    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
};

// ✅ PROTECTED - NEEDS TOKEN
export const addToCart = async (req, res, next) => {
  try {
    const result = await customerService.addToCart(req.user.id, req.validatedData);
    res.json({ success: true, message: 'Item added to cart', data: result });
  } catch (error) {
    next(error);
  }
};

export const getCart = async (req, res, next) => {
  try {
    const cart = await customerService.getCart(req.user.id);
    res.json({ success: true, message: 'Cart retrieved successfully', data: cart });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const order = await customerService.createOrder(req.user.id, req.validatedData);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await customerService.getOrders(req.user.id, req.query);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};
