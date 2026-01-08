const { classroomService } = require('../services');
const { classroomValidator } = require('../validators');
const { asyncHandler } = require('../middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Classroom:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         schoolId:
 *           type: string
 *         name:
 *           type: string
 *         capacity:
 *           type: number
 *         resources:
 *           type: array
 *           items:
 *             type: string
 *         floor:
 *           type: number
 *         building:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateClassroomRequest:
 *       type: object
 *       required:
 *         - name
 *         - capacity
 *       properties:
 *         schoolId:
 *           type: string
 *           description: Required for SUPERADMIN, auto-injected for SCHOOL_ADMIN
 *         name:
 *           type: string
 *           example: Room 101
 *         capacity:
 *           type: number
 *           example: 30
 *         resources:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Projector", "Whiteboard", "AC"]
 *         floor:
 *           type: number
 *           example: 1
 *         building:
 *           type: string
 *           example: Main Building
 */

/**
 * Create a new classroom
 * @route POST /api/classrooms
 */
const createClassroom = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = classroomValidator.validateCreateClassroom(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  // Use scoped schoolId (injected by scope middleware)
  value.schoolId = req.scopedSchoolId;

  const classroom = await classroomService.createClassroom(value);

  res.status(201).json({
    success: true,
    message: 'Classroom created successfully',
    data: classroom,
  });
});

/**
 * Get all classrooms
 * @route GET /api/classrooms
 */
const getAllClassrooms = asyncHandler(async (req, res) => {
  // Validate query params
  const { error, value } = classroomValidator.validateQuery(req.query);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  // Use school filter from scope middleware
  const result = await classroomService.getAllClassrooms(value, req.schoolFilter);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get classroom by ID
 * @route GET /api/classrooms/:id
 */
const getClassroomById = asyncHandler(async (req, res) => {
  const classroom = await classroomService.getClassroomById(
    req.params.id,
    req.schoolFilter
  );

  res.status(200).json({
    success: true,
    data: classroom,
  });
});

/**
 * Update classroom
 * @route PUT /api/classrooms/:id
 */
const updateClassroom = asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = classroomValidator.validateUpdateClassroom(req.body);

  if (error) {
    error.isJoi = true;
    throw error;
  }

  // Use pre-fetched resource from scope middleware
  const classroom = await classroomService.updateClassroom(
    req.params.id,
    value,
    req.resource
  );

  res.status(200).json({
    success: true,
    message: 'Classroom updated successfully',
    data: classroom,
  });
});

/**
 * Delete classroom
 * @route DELETE /api/classrooms/:id
 */
const deleteClassroom = asyncHandler(async (req, res) => {
  // Use pre-fetched resource from scope middleware
  const result = await classroomService.deleteClassroom(
    req.params.id,
    req.resource
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Get students in a classroom
 * @route GET /api/classrooms/:id/students
 */
const getClassroomStudents = asyncHandler(async (req, res) => {
  const students = await classroomService.getClassroomStudents(
    req.params.id,
    req.schoolFilter
  );

  res.status(200).json({
    success: true,
    data: students,
  });
});

module.exports = {
  createClassroom,
  getAllClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  getClassroomStudents,
};
