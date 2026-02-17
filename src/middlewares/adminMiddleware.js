import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { AppError } from '../utils/error.js';
import { logError } from '../utils/logger.js';

export const adminAuth = async (req, res, next) => {
  try {

    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No valid Bearer token provided', 401);
    }
    
    const token = authHeader.slice(7);
    
    
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      logError('JWT_ACCESS_SECRET missing');
      throw new AppError('Server configuration error', 500);
    }

    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (!decoded.id) {
      throw new AppError('Invalid token payload', 401);
    }
   
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        role: true,
        isActive: true 
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isActive) {  
      throw new AppError('Account inactive', 403);
    }

    if (user.role !== 'ADMIN') {
      throw new AppError('Admin access required', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logError('Admin auth failed - JWT Error', {
        error: error.name,
        message: error.message,
        tokenPrefix: req.header('Authorization')?.substring(0, 20) + '...'
      });
    } else {
      logError('Admin auth failed', error);
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message
      });
    }
    
    res.status(401).json({ 
      status: 'error', 
      message: 'Invalid token' 
    });
  }
};
