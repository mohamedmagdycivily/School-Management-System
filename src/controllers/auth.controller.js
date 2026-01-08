const { authService } = require('../services');
const { authValidator } = require('../validators');
const { asyncHandler, ApiError } = require('../middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@school.com
 *         password:
 *           type: string
 *           format: password
 *           example: Password123
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [SUPERADMIN, SCHOOL_ADMIN]
 *             token:
 *               type: string
 *     SetupRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - setupSecret
 *       properties:
 *         name:
 *           type: string
 *           example: Super Admin
 *         email:
 *           type: string
 *           format: email
 *           example: superadmin@school.com
 *         password:
 *           type: string
 *           format: password
 *           example: Password123
 *         setupSecret:
 *           type: string
 *           description: Secret key for initial setup
 */

/**
 * Login user
 * @route POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = authValidator.validateLogin(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  const result = await authService.login(value.email, value.password);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

/**
 * Setup initial superadmin
 * @route POST /api/auth/setup
 */
const setup = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = authValidator.validateSetup(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  const result = await authService.setup(value);

  res.status(201).json({
    success: true,
    message: 'Superadmin created successfully',
    data: result,
  });
});

/**
 * Get current user profile
 * @route GET /api/auth/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const result = await authService.getProfile(req.user.userId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  login,
  setup,
  getProfile,
};
