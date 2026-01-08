const express = require('express');
const router = express.Router();
const { schoolController } = require('../controllers');
const { authenticate, superadminOnly } = require('../middleware');

/**
 * @swagger
 * tags:
 *   name: Schools
 *   description: School management (Superadmin only)
 */

/**
 * @swagger
 * /api/schools:
 *   post:
 *     summary: Create a new school
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSchoolRequest'
 *     responses:
 *       201:
 *         description: School created successfully
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
 *                   $ref: '#/components/schemas/School'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Superadmin only
 *       409:
 *         description: School with this name already exists
 */
router.post('/', authenticate, superadminOnly, schoolController.createSchool);

/**
 * @swagger
 * /api/schools:
 *   get:
 *     summary: Get all schools
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
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
 *           enum: [name, createdAt, updatedAt]
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
 *         description: Schools retrieved successfully
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
 *                     schools:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/School'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Superadmin only
 */
router.get('/', authenticate, superadminOnly, schoolController.getAllSchools);

/**
 * @swagger
 * /api/schools/{id}:
 *   get:
 *     summary: Get school by ID
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
 *     responses:
 *       200:
 *         description: School retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/School'
 *                     - type: object
 *                       properties:
 *                         stats:
 *                           type: object
 *                           properties:
 *                             classrooms:
 *                               type: integer
 *                             students:
 *                               type: integer
 *                             admins:
 *                               type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Superadmin only
 *       404:
 *         description: School not found
 */
router.get('/:id', authenticate, superadminOnly, schoolController.getSchoolById);

/**
 * @swagger
 * /api/schools/{id}:
 *   put:
 *     summary: Update school
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: object
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: School updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Superadmin only
 *       404:
 *         description: School not found
 *       409:
 *         description: School with this name already exists
 */
router.put('/:id', authenticate, superadminOnly, schoolController.updateSchool);

/**
 * @swagger
 * /api/schools/{id}:
 *   delete:
 *     summary: Delete school
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
 *     responses:
 *       200:
 *         description: School deleted successfully
 *       400:
 *         description: Cannot delete - school has dependencies
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Superadmin only
 *       404:
 *         description: School not found
 */
router.delete('/:id', authenticate, superadminOnly, schoolController.deleteSchool);

/**
 * @swagger
 * /api/schools/{id}/admin:
 *   post:
 *     summary: Create school admin for a specific school
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSchoolAdminRequest'
 *     responses:
 *       201:
 *         description: School admin created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Superadmin only
 *       404:
 *         description: School not found
 *       409:
 *         description: Email already in use
 */
router.post('/:id/admin', authenticate, superadminOnly, schoolController.createSchoolAdmin);

/**
 * @swagger
 * /api/schools/{id}/admins:
 *   get:
 *     summary: Get all admins for a specific school
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
 *     responses:
 *       200:
 *         description: School admins retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Superadmin only
 *       404:
 *         description: School not found
 */
router.get('/:id/admins', authenticate, superadminOnly, schoolController.getSchoolAdmins);

module.exports = router;
