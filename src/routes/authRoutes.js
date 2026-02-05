import { Router } from 'express';
import {
 register,
 login,
 resendVerification,
 verifyEmail
} from '../controllers/authController.js';
import { validateRequest } from '../middlewares/authMiddleware.js';
import {
 registerValidation,
 loginValidation,
 resendVerificationValidation
} from '../validation/authValidation.js';

const router = Router();

router.post('/register', register.validate, register);
router.post('/login', login.validate, login);
router.post('/resend-verification', validateRequest(resendVerificationValidation), resendVerification);
router.get('/verify-email', verifyEmail);

export default router;
