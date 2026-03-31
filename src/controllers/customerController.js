import { CustomerService } from '../service/customerService.js';

const customerService = new CustomerService();

export const register = async (req, res, next) => {
  try {
    const result = await customerService.register(req.validatedData);
    return res.status(201).json({
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
    return res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurants = async (req, res, next) => {
  try {
    const restaurants = await customerService.getRestaurants(req.query);
    return res.json(restaurants);
  } catch (error) {
    next(error);
  }
};

export const getRestaurantMenu = async (req, res, next) => {
  try {
    const menu = await customerService.getRestaurantMenu(req.params.id);
    return res.json(menu);
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const result = await customerService.addToCart(req.user.id, req.validatedData);
    return res.json({
      success: true,
      message: 'Item added to cart',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getCart = async (req, res, next) => {
  try {
    const cart = await customerService.getCart(req.user.id);
    return res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const order = await customerService.createOrder(req.user.id, req.validatedData);
    return res.status(201).json({
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
    return res.json(orders);
  } catch (error) {
    next(error);
  }
};
