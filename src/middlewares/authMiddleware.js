import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        success: false 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
    console.log('TOKEN DECODED:', decoded);
  
    if (!decoded.userId) {
      return res.status(401).json({ 
        error: 'Invalid token payload',
        success: false 
      });
    }
    
    req.user = { 
      id: decoded.userId,
      role: decoded.role 
    };
    
    next();
  } catch (error) {
    console.error('JWT ERROR:', error.message);
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      success: false 
    });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        success: false 
      });
    }
    next();
  };
};
