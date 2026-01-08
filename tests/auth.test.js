const request = require('supertest');
const { User, ROLES } = require('../src/models');
const config = require('../src/config');

// Mock Redis and rate limiter before importing app
require('./helpers/mockRedis');

// Create a minimal test app
const express = require('express');
const authRoutes = require('../src/routes/auth.routes');
const { errorHandler } = require('../src/middleware');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Authentication Tests', () => {
  describe('POST /api/auth/setup', () => {
    it('should create initial superadmin with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          name: 'Super Admin',
          email: 'superadmin@test.com',
          password: 'Password123',
          setupSecret: config.SETUP_SECRET,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.role).toBe(ROLES.SUPERADMIN);
      expect(response.body.data.user.email).toBe('superadmin@test.com');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject duplicate superadmin creation', async () => {
      // Create first superadmin
      await User.create({
        name: 'Existing Admin',
        email: 'existing@test.com',
        password: 'Password123',
        role: ROLES.SUPERADMIN,
        schoolId: null,
      });

      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          name: 'Another Admin',
          email: 'another@test.com',
          password: 'Password123',
          setupSecret: config.SETUP_SECRET,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_SUPERADMIN_EXISTS');
    });

    it('should reject invalid setup secret', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          name: 'Super Admin',
          email: 'superadmin@test.com',
          password: 'Password123',
          setupSecret: 'wrong-secret',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_INVALID_SETUP_SECRET');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          email: 'superadmin@test.com',
          // missing name, password, setupSecret
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate password complexity', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          name: 'Super Admin',
          email: 'superadmin@test.com',
          password: 'weak', // Too short, no uppercase, no number
          setupSecret: config.SETUP_SECRET,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await User.create({
        name: 'Test User',
        email: 'testuser@test.com',
        password: 'Password123',
        role: ROLES.SUPERADMIN,
        schoolId: null,
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('testuser@test.com');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com',
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should reject deactivated account', async () => {
      // Deactivate the user
      await User.updateOne(
        { email: 'testuser@test.com' },
        { isActive: false }
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_ACCOUNT_DEACTIVATED');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
      const jwt = require('jsonwebtoken');
      
      testUser = await User.create({
        name: 'Profile User',
        email: 'profile@test.com',
        password: 'Password123',
        role: ROLES.SUPERADMIN,
        schoolId: null,
      });

      authToken = jwt.sign(
        {
          userId: testUser._id,
          email: testUser.email,
          role: testUser.role,
          schoolId: testUser.schoolId,
        },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('profile@test.com');
      expect(response.body.data.role).toBe(ROLES.SUPERADMIN);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_TOKEN_REQUIRED');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_TOKEN_INVALID');
    });

    it('should reject expired token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        {
          userId: testUser._id,
          email: testUser.email,
          role: testUser.role,
        },
        config.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_TOKEN_EXPIRED');
    });
  });
});
