/**
 * Mock Redis client and rate limiter for testing
 * Completely bypasses Redis-based rate limiting in tests
 */

// Store for mock Redis operations
const store = new Map();

// Mock Redis client
const mockRedisClient = {
  get: jest.fn((key) => Promise.resolve(store.get(key) || null)),
  set: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve('OK');
  }),
  del: jest.fn((key) => {
    store.delete(key);
    return Promise.resolve(1);
  }),
  incr: jest.fn((key) => {
    const current = parseInt(store.get(key) || '0', 10);
    store.set(key, String(current + 1));
    return Promise.resolve(current + 1);
  }),
  expire: jest.fn(() => Promise.resolve(1)),
  pexpire: jest.fn(() => Promise.resolve(1)),
  ttl: jest.fn(() => Promise.resolve(-1)),
  pttl: jest.fn(() => Promise.resolve(-1)),
  call: jest.fn(async (...args) => {
    const command = String(args[0]).toUpperCase();
    if (command === 'GET') {
      return store.get(args[1]) || null;
    }
    if (command === 'SET') {
      store.set(args[1], args[2]);
      return 'OK';
    }
    if (command === 'PEXPIRE' || command === 'EXPIRE') {
      return 1;
    }
    if (command === 'EVALSHA' || command === 'EVAL') {
      // Return mock rate limit response [totalHits, resetTime]
      return [1, Date.now() + 900000];
    }
    return null;
  }),
  on: jest.fn(),
  quit: jest.fn(() => Promise.resolve()),
  duplicate: jest.fn(function() { return this; }),
  status: 'ready',
};

const clearMockRedis = () => {
  store.clear();
};

// Mock the redis config module
jest.mock('../../src/config/redis', () => ({
  createRedisClient: jest.fn(() => mockRedisClient),
  getRedisClient: jest.fn(() => mockRedisClient),
  disconnectRedis: jest.fn(() => Promise.resolve()),
}));

// Create a no-op rate limiter middleware for tests
const noOpRateLimiter = (req, res, next) => {
  // Add mock headers
  res.set('RateLimit-Limit', '100');
  res.set('RateLimit-Remaining', '99');
  res.set('RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 900));
  next();
};

// Mock the rate limiter middleware module
jest.mock('../../src/middleware/rateLimiter.middleware', () => ({
  createRateLimiter: jest.fn(() => noOpRateLimiter),
  apiLimiter: noOpRateLimiter,
  authLimiter: noOpRateLimiter,
  sensitiveLimiter: noOpRateLimiter,
  customLimiter: jest.fn(() => noOpRateLimiter),
}));

module.exports = {
  mockRedisClient,
  clearMockRedis,
  noOpRateLimiter,
};
