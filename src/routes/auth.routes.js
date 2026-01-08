const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authenticate, authLimiter } = require('../middleware');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', authLimiter, authController.login);

/**
 * @swagger
 * /api/auth/setup:
 *   post:
 *     summary: Create initial superadmin account
 *     tags: [Authentication]
 *     description: Creates the first superadmin account. This endpoint only works if no superadmin exists yet.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetupRequest'
 *     responses:
 *       201:
 *         description: Superadmin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Superadmin already exists
 *       403:
 *         description: Invalid setup secret
 */
router.post('/setup', authLimiter, authController.setup);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     school:
 *                       type: object
 *                     isActive:
 *                       type: boolean
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
