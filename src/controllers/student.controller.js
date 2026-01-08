const { studentService } = require('../services');
const { studentValidator } = require('../validators');
const { asyncHandler } = require('../middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         schoolId:
 *           type: string
 *         classroomId:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         fullName:
 *           type: string
 *         dob:
 *           type: string
 *           format: date
 *         age:
 *           type: number
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER]
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         status:
 *           type: string
 *           enum: [ENROLLED, TRANSFERRED, GRADUATED]
 *         enrollmentDate:
 *           type: string
 *           format: date-time
 *         graduationDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateStudentRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - dob
 *       properties:
 *         schoolId:
 *           type: string
 *           description: Required for SUPERADMIN, auto-injected for SCHOOL_ADMIN
 *         classroomId:
 *           type: string
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Smith
 *         dob:
 *           type: string
 *           format: date
 *           example: "2010-05-15"
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER]
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         guardianInfo:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             relationship:
 *               type: string
 *             phone:
 *               type: string
 *             email:
 *               type: string
 *         status:
 *           type: string
 *           enum: [ENROLLED, TRANSFERRED, GRADUATED]
 *           default: ENROLLED
 */

/**
 * Create (enroll) a new student
 * @route POST /api/students
 */
const createStudent = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = studentValidator.validateCreateStudent(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  // Use scoped schoolId (injected by scope middleware)
  value.schoolId = req.scopedSchoolId;

  const student = await studentService.createStudent(value);

  res.status(201).json({
    success: true,
    message: 'Student enrolled successfully',
    data: student,
  });
});

/**
 * Get all students
 * @route GET /api/students
 */
const getAllStudents = asyncHandler(async (req, res) => {
  // Validate query params
  const { error, value } = studentValidator.validateQuery(req.query);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  // Use school filter from scope middleware
  const result = await studentService.getAllStudents(value, req.schoolFilter);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get student by ID
 * @route GET /api/students/:id
 */
const getStudentById = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(
    req.params.id,
    req.schoolFilter
  );

  res.status(200).json({
    success: true,
    data: student,
  });
});

/**
 * Update student
 * @route PUT /api/students/:id
 */
const updateStudent = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = studentValidator.validateUpdateStudent(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  // Use pre-fetched resource from scope middleware
  const student = await studentService.updateStudent(
    req.params.id,
    value,
    req.resource
  );

  res.status(200).json({
    success: true,
    message: 'Student updated successfully',
    data: student,
  });
});

/**
 * Delete student
 * @route DELETE /api/students/:id
 */
const deleteStudent = asyncHandler(async (req, res) => {
  // Use pre-fetched resource from scope middleware
  const result = await studentService.deleteStudent(
    req.params.id,
    req.resource
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Transfer student to another classroom
 * @route PUT /api/students/:id/transfer
 */
const transferStudent = asyncHandler(async (req, res) => {
  const { classroomId } = req.body;

  if (!classroomId) {
    return res.status(400).json({
      success: false,
      error: 'classroomId is required',
      code: 'VALIDATION_ERROR',
    });
  }

  // Use pre-fetched resource from scope middleware
  const student = await studentService.transferStudent(
    req.params.id,
    classroomId,
    req.resource
  );

  res.status(200).json({
    success: true,
    message: 'Student transferred successfully',
    data: student,
  });
});

/**
 * Get student statistics
 * @route GET /api/students/stats
 */
const getStudentStats = asyncHandler(async (req, res) => {
  const stats = await studentService.getStudentStats(req.schoolFilter);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  transferStudent,
  getStudentStats,
};
