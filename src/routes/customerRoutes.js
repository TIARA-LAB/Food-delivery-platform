import { Router } from 'express';
import {
  register, login, getRestaurants, getRestaurantMenu,
  addToCart, getCart, createOrder, getOrders
} from '../controllers/customerController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { customerValidators } from '../validation/customerValidation.js';

const router = Router();

// PUBLIC ROUTES (NO AUTH REQUIRED)
router.post('/register', customerValidators.register, register);
router.post('/login', customerValidators.login, login);
router.get('/restaurants', getRestaurants);
router.get('/restaurants/:id/menu', getRestaurantMenu);

// PROTECTED ROUTES (AUTH REQUIRED)
router.use(authenticateToken);
router.post('/cart/add', customerValidators.addToCart, addToCart);
router.get('/cart', getCart); 
router.post('/orders', customerValidators.createOrder, createOrder);
router.get('/orders', getOrders);

export default router;
