import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error.js';
import { config } from '../config/index.js';
import { logError } from '../utils/logger.js';

export const authenticateToken = async (req, res, next) => {
 try {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
   return next(new AppError('Access token required', 401));
  }

  const decoded = jwt.verify(token, config.jwt.accessSecret);
  req.user = decoded;
  next();
 } catch (error) {
  logError('Token verification failed:', error);
  next(new AppError('Invalid token', 401));
 }
};

export const authorizeRoles = (...roles) => {
 return (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
   return next(new AppError('Insufficient permission', 403));
  }
  next();
 };
};

export const validateRequest = (validations) => {
 return async (req, res, next) => {
  await Promise.all(validations.map(validation => validation.run(req)));


  const errors = validationResult(req);
  if (!errors.isEmpty()) {
   const errorMessages = errors.array().map(err => err.msg).join(', ');
   throw new AppError(errorMessages, 400);
  }
  next();
 };
};
