import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { AppError } from '../utils/error.js';

export const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        isActive: true,
        isSuperAdmin: true  
      }
    });

    if (!user || !user.isActive || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new AppError('Admin access required', 403);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin ?? user.role === 'SUPER_ADMIN'  
    };

    next();
  } catch (error) {
    throw new AppError(error.message || 'Invalid token', 401);
  }
};

export const superAdminAuth = async (req, res, next) => {
  try {
    await adminAuth(req, res, next);
    
    if (!req.user?.isSuperAdmin) {
      throw new AppError('Super admin access required', 403);
    }
    
    next();
  } catch (error) {
    next(error); 
  }
};
