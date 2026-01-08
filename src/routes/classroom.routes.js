const express = require('express');
const router = express.Router();
const { classroomController } = require('../controllers');
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
 *   name: Classrooms
 *   description: Classroom management (RBAC enforced)
 */

/**
 * @swagger
 * /api/classrooms:
 *   post:
 *     summary: Create a new classroom
 *     tags: [Classrooms]
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
 *             $ref: '#/components/schemas/CreateClassroomRequest'
 *     responses:
 *       201:
 *         description: Classroom created successfully
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
 *                   $ref: '#/components/schemas/Classroom'
 *       400:
 *         description: Validation error or schoolId required for superadmin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Classroom with this name already exists in the school
 */
router.post(
  '/',
  authenticate,
  anyAdmin,
  injectSchoolId,
  classroomController.createClassroom
);

/**
 * @swagger
 * /api/classrooms:
 *   get:
 *     summary: Get all classrooms
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       - **SUPERADMIN**: Can see all classrooms, optionally filter by `schoolId`
 *       - **SCHOOL_ADMIN**: Only sees classrooms from their assigned school
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or building
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, capacity, createdAt, updatedAt]
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
 *         description: Classrooms retrieved successfully
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
 *                     classrooms:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Classroom'
 *                           - type: object
 *                             properties:
 *                               currentStudents:
 *                                 type: integer
 *                               availableCapacity:
 *                                 type: integer
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
  classroomController.getAllClassrooms
);

/**
 * @swagger
 * /api/classrooms/{id}:
 *   get:
 *     summary: Get classroom by ID
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Classroom ID
 *     responses:
 *       200:
 *         description: Classroom retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - classroom belongs to different school
 *       404:
 *         description: Classroom not found
 */
router.get(
  '/:id',
  authenticate,
  anyAdmin,
  filterBySchool,
  classroomController.getClassroomById
);

/**
 * @swagger
 * /api/classrooms/{id}:
 *   put:
 *     summary: Update classroom
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Classroom ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               resources:
 *                 type: array
 *                 items:
 *                   type: string
 *               floor:
 *                 type: integer
 *               building:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Classroom updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - classroom belongs to different school
 *       404:
 *         description: Classroom not found
 *       409:
 *         description: Classroom with this name already exists
 */
router.put(
  '/:id',
  authenticate,
  anyAdmin,
  validateResourceOwnership('Classroom'),
  classroomController.updateClassroom
);

/**
 * @swagger
 * /api/classrooms/{id}:
 *   delete:
 *     summary: Delete classroom
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Classroom ID
 *     responses:
 *       200:
 *         description: Classroom deleted successfully
 *       400:
 *         description: Cannot delete - classroom has enrolled students
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - classroom belongs to different school
 *       404:
 *         description: Classroom not found
 */
router.delete(
  '/:id',
  authenticate,
  anyAdmin,
  validateResourceOwnership('Classroom'),
  classroomController.deleteClassroom
);

/**
 * @swagger
 * /api/classrooms/{id}/students:
 *   get:
 *     summary: Get students in a classroom
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Classroom ID
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - classroom belongs to different school
 *       404:
 *         description: Classroom not found
 */
router.get(
  '/:id/students',
  authenticate,
  anyAdmin,
  filterBySchool,
  classroomController.getClassroomStudents
);

module.exports = router;
