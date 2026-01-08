const { authenticate, generateToken, verifyToken } = require('./auth.middleware');
const { permit, superadminOnly, schoolAdminOnly, anyAdmin, isSuperAdmin, isSchoolAdmin } = require('./rbac.middleware');
const { injectSchoolId, filterBySchool, validateResourceOwnership } = require('./scope.middleware');
const { apiLimiter, authLimiter, sensitiveLimiter, customLimiter, createRateLimiter } = require('./rateLimiter.middleware');
const { ApiError, notFoundHandler, errorHandler, asyncHandler } = require('./errorHandler.middleware');

module.exports = {
  // Authentication
  authenticate,
  generateToken,
  verifyToken,

  // RBAC
  permit,
  superadminOnly,
  schoolAdminOnly,
  anyAdmin,
  isSuperAdmin,
  isSchoolAdmin,

  // Scope
  injectSchoolId,
  filterBySchool,
  validateResourceOwnership,

  // Rate Limiting
  apiLimiter,
  authLimiter,
  sensitiveLimiter,
  customLimiter,
  createRateLimiter,

  // Error Handling
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
