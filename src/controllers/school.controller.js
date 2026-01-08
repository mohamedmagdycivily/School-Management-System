const { schoolService } = require('../services');
const { schoolValidator } = require('../validators');
const { asyncHandler } = require('../middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     School:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         contactEmail:
 *           type: string
 *         contactPhone:
 *           type: string
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateSchoolRequest:
 *       type: object
 *       required:
 *         - name
 *         - contactEmail
 *       properties:
 *         name:
 *           type: string
 *           example: Springfield High School
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         contactEmail:
 *           type: string
 *           format: email
 *           example: info@springfield.edu
 *         contactPhone:
 *           type: string
 *           example: +1-555-0123
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *           default: ACTIVE
 *     CreateSchoolAdminRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@school.com
 *         password:
 *           type: string
 *           format: password
 *           example: SecurePass123
 */

/**
 * Create a new school
 * @route POST /api/schools
 */
const createSchool = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = schoolValidator.validateCreateSchool(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  const school = await schoolService.createSchool(value, req.user.userId);

  res.status(201).json({
    success: true,
    message: 'School created successfully',
    data: school,
  });
});

/**
 * Get all schools
 * @route GET /api/schools
 */
const getAllSchools = asyncHandler(async (req, res) => {
  // Validate query params
  const { error, value } = schoolValidator.validateQuery(req.query);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  const result = await schoolService.getAllSchools(value);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get school by ID
 * @route GET /api/schools/:id
 */
const getSchoolById = asyncHandler(async (req, res) => {
  const school = await schoolService.getSchoolById(req.params.id);

  res.status(200).json({
    success: true,
    data: school,
  });
});

/**
 * Update school
 * @route PUT /api/schools/:id
 */
const updateSchool = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = schoolValidator.validateUpdateSchool(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  const school = await schoolService.updateSchool(req.params.id, value);

  res.status(200).json({
    success: true,
    message: 'School updated successfully',
    data: school,
  });
});

/**
 * Delete school
 * @route DELETE /api/schools/:id
 */
const deleteSchool = asyncHandler(async (req, res) => {
  const result = await schoolService.deleteSchool(req.params.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Create school admin for a specific school
 * @route POST /api/schools/:id/admin
 */
const createSchoolAdmin = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = schoolValidator.validateCreateSchoolAdmin(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  const admin = await schoolService.createSchoolAdmin(req.params.id, value);

  res.status(201).json({
    success: true,
    message: 'School admin created successfully',
    data: admin,
  });
});

/**
 * Get all admins for a specific school
 * @route GET /api/schools/:id/admins
 */
const getSchoolAdmins = asyncHandler(async (req, res) => {
  const admins = await schoolService.getSchoolAdmins(req.params.id);

  res.status(200).json({
    success: true,
    data: admins,
  });
});

module.exports = {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  deleteSchool,
  createSchoolAdmin,
  getSchoolAdmins,
};
