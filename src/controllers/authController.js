import { AuthService } from '../service/authService.js';
import { AppError } from '../utils/error.js';
import { logInfo, logError } from '../utils/logger.js';
import { registerValidation, loginValidation } from '../validation/authValidation.js';

const authService = new AuthService();

export const register = [
  (req, res, next) => { req.body = req.body || {}; next(); },
  registerValidation,
  async (req, res, next) => {
    try {
      const { email, password, name, role } = req.body;
      const result = await authService.register(email, password, name, role);
      logInfo(`User registered: ${result.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful! Tokens generated.',
        data: result
      });
    } catch (error) {
      logError('Register error:', { email: req.body?.email, error: error.message });
      if (error instanceof AppError) return next(error);
      next(new AppError('Registration failed', 500));
    }
  }
];

export const login = [
  (req, res, next) => { req.body = req.body || {}; next(); },
  loginValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      logInfo(`User logged in: ${result.user.id}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      logError('Login error:', { error: error.message });
      if (error instanceof AppError) return next(error);
      next(new AppError('Login failed', 500));
    }
  }
];
