import { z } from 'zod';
import { logError } from '../utils/logger.js';

export const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100)
});

export const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  addressId: z.string().uuid(),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).optional().default('CASH')
});

export const validateBody = (schema) => (req, res, next) => {
  try {
    console.log(' req.body:', req.body);
    
    const data = schema.parse(req.body);
    req.validatedData = data;
    console.log('Validated:', data);
    next();
  } catch (error) {
    console.log('Zod error:', error);
    
    const issues = error.issues || [];
    logError('Validation failed', { 
      path: req.path, 
      body: req.body, 
      issues 
    });

    res.status(400).json({
      success: false,
      message: error.issues?.[0]?.message || 'Validation failed',
      errors: issues.map(i => i.message)
    });
  }
};


export const customerValidators = {
  register: validateBody(registerSchema),
  login: validateBody(loginSchema),
  addToCart: validateBody(addToCartSchema),
  createOrder: validateBody(createOrderSchema)
};
