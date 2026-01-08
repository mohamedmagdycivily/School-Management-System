const { ROLES } = require('../models');

/**
 * Role-Based Access Control Middleware
 * Restricts access to routes based on user roles
 * 
 * @param {...string} allowedRoles - Roles that are permitted to access the route
 * @returns {Function} Express middleware function
 */
const permit = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'RBAC_NOT_AUTHENTICATED',
      });
    }

    const userRole = req.user.role;

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'RBAC_PERMISSION_DENIED',
      });
    }

    next();
  };
};

/**
 * Superadmin Only Middleware
 * Shorthand for permit(ROLES.SUPERADMIN)
 */
const superadminOnly = permit(ROLES.SUPERADMIN);

/**
 * School Admin Only Middleware
 * Shorthand for permit(ROLES.SCHOOL_ADMIN)
 */
const schoolAdminOnly = permit(ROLES.SCHOOL_ADMIN);

/**
 * Any Admin Middleware
 * Allows both SUPERADMIN and SCHOOL_ADMIN
 */
const anyAdmin = permit(ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN);

/**
 * Check if user is superadmin
 */
const isSuperAdmin = (user) => {
  return user && user.role === ROLES.SUPERADMIN;
};

/**
 * Check if user is school admin
 */
const isSchoolAdmin = (user) => {
  return user && user.role === ROLES.SCHOOL_ADMIN;
};

module.exports = {
  permit,
  superadminOnly,
  schoolAdminOnly,
  anyAdmin,
  isSuperAdmin,
  isSchoolAdmin,
};
