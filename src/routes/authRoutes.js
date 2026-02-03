import { Router } from 'express';
import {
 register,
 login,
 resendVerification,
 verifyEmail
} from '../controllers/authController.js';
import { loginLimiter, registerLimiter } from '../utils/rateLimiter.js';
import { resendVerificationValidation } from '../validation/authValidation.js';

const router = Router();

router.post('/register', registerLimiter, register.validate, register);
router.post('/login', loginLimiter, login.validate, login);
router.post('/resend-verification', registerLimiter, resendVerificationValidation, resendVerification);
router.get('/verify-email', verifyEmail);

export default router;
