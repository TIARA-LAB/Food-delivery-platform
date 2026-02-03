import { AuthService } from '../service/authService.js';
import { AppError } from '../utils/error.js';
import { logInfo, logWarn, logError } from '../utils/logger.js'; 
import { registerValidation, loginValidation, resendVerificationValidation } from '../validation/authValidation.js';
import { validateRequest } from '../middlewares/authMiddleware.js';

const authService = new AuthService();

export const register = async (req, res, next) => {
 try {
  const { email, password, name, role } = req.body;
  const result = await authService.register(email, password, name, role);

  logger.logInfo(`User registered: ${result.user.id}`);

  res.status(201).json({
   success: true,
   message: 'User registered successfully. Please check your email for verification.',
   data: result
  });
 } catch (error) {
  logger.logError('Register controller error:', error);
  next(error);
 }
};

export const login = async (req, res, next) => {
 try {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  logger.logInfo(`User logged in: ${result.user.id}`);

  res.json({
   success: true,
   data: result
  });
 } catch (error) {
  logger.logError('Login controller error:', error);
  next(error);
 }
};

export const resendVerification = async (req, res, next) => {
 try {
  const { email } = req.body;
  await authService.sendVerificationEmail(email);

  res.json({
   success: true,
   message: 'Verification email resent successfully'
  });
 } catch (error) {
  logger.logError('Resend verification error:', error);
  next(error);
 }
};

export const verifyEmail = async (req, res, next) => {
 try {
  const { token } = req.query;

  if (!token) {
   throw new AppError('Verification token required', 400);
  }

  await authService.verifyEmail(token);
  res.json({
   success: true,
   message: 'Email verified successfully'
  });
 } catch (error) {
  logger.logError('Email verification error:', error);
  next(error);
 }
};

// Attach validation methods
register.validate = validateRequest(registerValidation);
login.validate = validateRequest(loginValidation);
resendVerification.validate = validateRequest(resendVerificationValidation);
