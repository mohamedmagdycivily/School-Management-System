const express = require('express');
const router = express.Router();
const { studentController } = require('../controllers');
const {
  authenticate,
  anyAdmin,
  injectSchoolId,
  filterBySchool,
  validateResourceOwnership,
} = require('../middleware');

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student management (RBAC enforced)
 */

/**
 * @swagger
 * /api/students/stats:
 *   get:
 *     summary: Get student statistics
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       - **SUPERADMIN**: Gets stats for all students
 *       - **SCHOOL_ADMIN**: Gets stats only for their school's students
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     enrolled:
 *                       type: integer
 *                     transferred:
 *                       type: integer
 *                     graduated:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/stats',
  authenticate,
  anyAdmin,
  filterBySchool,
  studentController.getStudentStats
);

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Enroll a new student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       - **SUPERADMIN**: Must provide `schoolId` in request body
 *       - **SCHOOL_ADMIN**: `schoolId` is auto-injected from user's assigned school
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStudentRequest'
 *     responses:
 *       201:
 *         description: Student enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validation error, classroom full, or schoolId required for superadmin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: School or classroom not found
 */
router.post(
  '/',
  authenticate,
  anyAdmin,
  injectSchoolId,
  studentController.createStudent
);

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       - **SUPERADMIN**: Can see all students, optionally filter by `schoolId`
 *       - **SCHOOL_ADMIN**: Only sees students from their assigned school
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: Filter by school (SUPERADMIN only)
 *       - in: query
 *         name: classroomId
 *         schema:
 *           type: string
 *         description: Filter by classroom
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ENROLLED, TRANSFERRED, GRADUATED]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [firstName, lastName, dob, enrollmentDate, createdAt, updatedAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     students:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Student'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  anyAdmin,
  filterBySchool,
  studentController.getAllStudents
);

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Get student by ID
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - student belongs to different school
 *       404:
 *         description: Student not found
 */
router.get(
  '/:id',
  authenticate,
  anyAdmin,
  filterBySchool,
  studentController.getStudentById
);

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Update student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               classroomId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ENROLLED, TRANSFERRED, GRADUATED]
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - student belongs to different school
 *       404:
 *         description: Student not found
 */
router.put(
  '/:id',
  authenticate,
  anyAdmin,
  validateResourceOwnership('Student'),
  studentController.updateStudent
);

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Delete student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - student belongs to different school
 *       404:
 *         description: Student not found
 */
router.delete(
  '/:id',
  authenticate,
  anyAdmin,
  validateResourceOwnership('Student'),
  studentController.deleteStudent
);

/**
 * @swagger
 * /api/students/{id}/transfer:
 *   put:
 *     summary: Transfer student to another classroom
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classroomId
 *             properties:
 *               classroomId:
 *                 type: string
 *                 description: Target classroom ID
 *     responses:
 *       200:
 *         description: Student transferred successfully
 *       400:
 *         description: Classroom full, student not enrolled, or classroomId required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied or classroom in different school
 *       404:
 *         description: Student or classroom not found
 */
router.put(
  '/:id/transfer',
  authenticate,
  anyAdmin,
  validateResourceOwnership('Student'),
  studentController.transferStudent
);

module.exports = router;
