import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aintuition_super_secret_jwt_access_key_2026');

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ detail: 'User not found or token invalid' });
      }
      if (req.user.is_active === false) {
        return res.status(403).json({ detail: 'This account has been deactivated. Please contact support.' });
      }
      return next();
    } catch (error) {
      console.error('Auth Middleware Error:', error.message);
      return res.status(401).json({ detail: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ detail: 'Not authorized, no token provided' });
  }
};

/**
 * Middleware: requireAdmin
 * Enforces admin authorization for staff endpoints
 */
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.is_staff) {
    return next();
  }
  return res.status(403).json({ detail: 'Admin privileges required' });
};
