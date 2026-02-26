import express from 'express';
import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  refreshSchema,
  validate
} from '../validation/authValidation.js'
import {
  registerLimiter,
  otpLimiter,
  loginLimiter
} from '../utils/rateLimiter.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile
} from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/resend-otp', otpLimiter, resendOtp);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);

export default router;
