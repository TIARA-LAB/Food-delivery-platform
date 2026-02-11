import { CustomerSchemas } from '../schema/customerSchema.js';
import { logError } from '../utils/logger.js';

export const validateRequest = (schema) => (req, res, next) => {
  try {
    const data = schema.parse(req.body || req.query);
    req.validatedData = data;
    next();
  } catch (error) {
    logError('Validation error', {
      path: req.path,
      method: req.method,
      errors: error.issues
    });

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }
};

export const customerValidators = {
  register: validateRequest(CustomerSchemas.register),
  login: validateRequest(CustomerSchemas.login),
  addToCart: validateRequest(CustomerSchemas.addToCart),
  createOrder: validateRequest(CustomerSchemas.createOrder)

};
