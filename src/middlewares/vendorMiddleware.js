import jwt from 'jsonwebtoken';
import prisma from '../config/db.js'; 
import { logInfo, logWarn, logError } from '../utils/logger.js';

export class VendorAuthMiddleware {
  static async auth(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const userId = decoded.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          email: true, 
          role: true, 
          isActive: true 
        }
      });

      if (!user || !user.isActive || user.role !== 'VENDOR') {
        logWarn('Auth failed', { 
          userId, 
          userRole: user?.role,
          isActive: user?.isActive 
        });
        return res.status(403).json({
          success: false,
          message: 'Vendor account inactive or access denied'
        });
      }

      req.user = {
        id: userId,
        email: user.email,
        role: 'VENDOR'
      };

      // Controller expects req.vendorId
      req.vendorId = userId;  

      logInfo('VendorAuthMiddleware: Auth successful', { userId });
      next();
    } catch (error) {
      logError('VendorAuthMiddleware: JWT verification failed', {
        ip: req.ip,
        error: error.message
      });

      const message = error.name === 'TokenExpiredError'
        ? 'Token expired. Please login again'
        : 'Invalid or expired token';

      res.status(401).json({ success: false, message });
    }
  }
}

export const vendorAuthMiddleware = VendorAuthMiddleware;
export default VendorAuthMiddleware;
