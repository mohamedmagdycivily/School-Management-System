const { User, ROLES } = require('../models');
const { generateToken } = require('../middleware/auth.middleware');
const { ApiError } = require('../middleware/errorHandler.middleware');
const config = require('../config');

class AuthService {
  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} User data and JWT token
   */
  async login(email, password) {
    // Find user with password field
    const user = await User.findByEmailWithPassword(email);

    if (!user) {
      throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is deactivated. Please contact administrator.', 'AUTH_ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
      token,
    };
  }

  /**
   * Setup initial superadmin account
   * @param {Object} data - Superadmin data (name, email, password, setupSecret)
   * @returns {Object} Created user data and JWT token
   */
  async setup(data) {
    const { name, email, password, setupSecret } = data;

    // Verify setup secret
    if (setupSecret !== config.SETUP_SECRET) {
      throw new ApiError(403, 'Invalid setup secret', 'AUTH_INVALID_SETUP_SECRET');
    }

    // Check if any superadmin already exists
    const existingSuperadmin = await User.findOne({ role: ROLES.SUPERADMIN });

    if (existingSuperadmin) {
      throw new ApiError(400, 'Superadmin already exists. Use login instead.', 'AUTH_SUPERADMIN_EXISTS');
    }

    // Check if email is already in use
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      throw new ApiError(409, 'Email already in use', 'AUTH_EMAIL_IN_USE');
    }

    // Create superadmin user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: ROLES.SUPERADMIN,
      schoolId: null,
    });

    // Generate JWT token
    const token = generateToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
      token,
    };
  }

  /**
   * Get current user profile
   * @param {string} userId - User ID
   * @returns {Object} User profile data
   */
  async getProfile(userId) {
    const user = await User.findById(userId).populate('schoolId', 'name status');

    if (!user) {
      throw new ApiError(404, 'User not found', 'AUTH_USER_NOT_FOUND');
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.schoolId,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }
}

module.exports = new AuthService();
