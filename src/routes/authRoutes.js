import { Router } from 'express';
import {
 register,
 login,
 resendVerification,
 verifyEmail
} from '../controllers/authController.js';

const router = Router();

router.post('/register',
 (req, res, next) => { req.body = req.body || {}; next(); },
 register[1],  // validation middleware
 register[2]   // handler
);

router.post('/login',
 (req, res, next) => { req.body = req.body || {}; next(); },
 login[1],
 login[2]
);

router.post('/resend-verification',
 (req, res, next) => { req.body = req.body || {}; next(); },
 resendVerification[1],
 resendVerification[2]
);

router.get('/verify-email', verifyEmail);

export default router;
