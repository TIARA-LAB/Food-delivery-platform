import { AuthService } from '../service/authService.js';
import { AppError } from '../utils/error.js';
import { logInfo, logError } from '../utils/logger.js';
import { registerValidation, loginValidation, resendVerificationValidation } from '../validation/authValidation.js';

const authService = new AuthService();

// 
export const register = [
 (req, res, next) => {
  req.body = req.body || {};
  next();
 },
 registerValidation,  // ← DIRECT IMPORT, NO .validate
 async (req, res, next) => {
  try {
   if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError('Request body is required', 400));
   }

   const { email, password, name, role } = req.body;
   if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
   }

   const result = await authService.register(email, password, name, role);
   logInfo(`User registered: ${result.user.id} (${result.user.email})`);

   res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result
   });
  } catch (error) {
   logError('Register controller error:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
   });

   if (error instanceof AppError) {
    return next(error);
   }
   next(new AppError('Registration failed', 500));
  }
 }
];

export const login = [
 (req, res, next) => {
  req.body = req.body || {};
  next();
 },
 loginValidation,
 async (req, res, next) => {
  try {
   if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError('Request body is required', 400));
   }

   const { email, password } = req.body;
   if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
   }

   const result = await authService.login(email, password);
   logInfo(`User logged in: ${result.user.id} (${result.user.email})`);

   res.json({
    success: true,
    message: 'Login successful',
    data: result
   });
  } catch (error) {
   logError('Login controller error:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
   });

   if (error instanceof AppError) {
    return next(error);
   }
   next(new AppError('Login failed', 500));
  }
 }
];

export const resendVerification = [
 (req, res, next) => {
  req.body = req.body || {};
  next();
 },
 resendVerificationValidation,
 async (req, res, next) => {
  try {
   if (!req.body || !req.body.email) {
    return next(new AppError('Email is required', 400));
   }

   const { email } = req.body;
   await authService.sendVerificationEmail(email);

   res.json({
    success: true,
    message: 'Verification email resent successfully. Check your inbox.'
   });
  } catch (error) {
   logError('Resend verification error:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
   });

   if (error instanceof AppError) {
    return next(error);
   }
   next(new AppError('Failed to resend verification email', 500));
  }
 }
];

export const verifyEmail = async (req, res, next) => {
 try {
  const { token } = req.query;

  if (!token) {
   return next(new AppError('Verification token is required in query parameter: ?token=...', 400));
  }

  if (typeof token !== 'string' || token.length < 10) {
   return next(new AppError('Invalid verification token format', 400));
  }

  await authService.verifyEmail(token);

  res.json({
   success: true,
   message: 'Email verified successfully'
  });
 } catch (error) {
  logError('Email verification error:', {
   token: req.query.token ? 'provided' : 'missing',
   error: error.message,
   stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  if (error instanceof AppError) {
   return next(error);
  }
  next(new AppError('Email verification failed', 500));
 }
};
