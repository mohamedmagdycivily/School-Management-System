const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
        code: 'AUTH_TOKEN_REQUIRED',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
        code: 'AUTH_TOKEN_REQUIRED',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired. Please login again.',
          code: 'AUTH_TOKEN_EXPIRED',
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please login again.',
          code: 'AUTH_TOKEN_INVALID',
        });
      }
      throw jwtError;
    }

    // Find user by ID from token
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Please login again.',
        code: 'AUTH_USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.',
        code: 'AUTH_ACCOUNT_DEACTIVATED',
      });
    }

    // Attach user to request
    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication.',
      code: 'AUTH_INTERNAL_ERROR',
    });
  }
};

/**
 * Generate JWT Token
 */
const generateToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

/**
 * Verify JWT Token (utility function)
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticate,
  generateToken,
  verifyToken,
};
