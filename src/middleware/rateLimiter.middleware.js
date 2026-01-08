const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { getRedisClient } = require('../config/redis');
const config = require('../config');

/**
 * Create Redis-backed rate limiter
 * Uses Redis for distributed rate limiting across multiple server instances
 */
const createRateLimiter = (options = {}) => {
  const redisClient = getRedisClient();

  const defaultOptions = {
    windowMs: config.RATE_LIMIT_WINDOW_MS, // 15 minutes
    max: config.RATE_LIMIT_MAX_REQUESTS, // 100 requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      success: false,
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    keyGenerator: (req) => {
      // Use IP address + user ID (if authenticated) as the key
      const userId = req.user?.userId || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress;
      return `${ip}:${userId}`;
    },
    skip: (req) => {
      // Skip rate limiting for health check endpoints
      return req.path === '/health' || req.path === '/api/health';
    },
    handler: (req, res, next, options) => {
      res.status(429).json(options.message);
    },
    // Prevent double counting for the same request
    validate: { xForwardedForHeader: false },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // Create Redis store for rate limiting
  mergedOptions.store = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:',
  });

  return rateLimit(mergedOptions);
};

/**
 * Standard API rate limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = createRateLimiter();

/**
 * Strict rate limiter for authentication endpoints
 * 10 requests per 15 minutes
 */
const authLimiter = createRateLimiter({
  max: 10,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Very strict rate limiter for sensitive operations
 * 5 requests per hour
 */
const sensitiveLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: 'Too many attempts for this sensitive operation. Please try again later.',
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Create a custom rate limiter with specific options
 */
const customLimiter = (windowMs, max, message) => {
  return createRateLimiter({
    windowMs,
    max,
    message: {
      success: false,
      error: message || 'Rate limit exceeded.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  });
};

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  sensitiveLimiter,
  customLimiter,
};
