import { AppError } from '../utils/error.js';  
import { logWarn } from '../utils/logger.js';

export const requireVendor = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    // Check if user exists AND has VENDOR role
    if (!userId || req.user.role !== 'VENDOR') {
      logWarn('Vendor access denied', { 
        userId: userId || 'anonymous', 
        role: req.user?.role 
      });
      throw new AppError('Vendor access required', 403);
    }

    req.vendorId = userId;  
    next();
  } catch (error) {
    next(error);
  }
};
