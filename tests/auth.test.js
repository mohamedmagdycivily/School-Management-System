/**
 * Authentication Tests
 * Tests User.manager.js methods: login, setup, profile, createSchoolAdmin
 * Uses the template's architecture pattern
 */
const User = require('../managers/entities/user/User.mongoModel');
const config = require('../config/index.config');

// Mock token manager
const mockTokenManager = {
  genLongToken: jest.fn(({ userId, userKey, role, schoolId }) => {
    return `mock-token-${userId}-${role}`;
  }),
  verifyLongToken: jest.fn(),
};

// Create User Manager instance with mocks
const UserManager = require('../managers/entities/user/User.manager');
let userManager;

beforeEach(() => {
  userManager = new UserManager({
    config,
    managers: {
      token: mockTokenManager,
    },
  });
  
  // Reset mocks
  mockTokenManager.genLongToken.mockClear();
  mockTokenManager.verifyLongToken.mockClear();
});

describe('User Manager - Authentication Tests', () => {
  describe('setup() - Initial Superadmin Creation', () => {
    it('should create initial superadmin with valid data', async () => {
      const result = await userManager.setup({
        name: 'Super Admin',
        email: 'superadmin@test.com',
        password: 'Password123',
        setupSecret: config.dotEnv.SETUP_SECRET,
      });

      expect(result.error).toBeUndefined();
      expect(result.user).toBeDefined();
      expect(result.user.role).toBe('SUPERADMIN');
      expect(result.user.email).toBe('superadmin@test.com');
      expect(result.token).toBeDefined();
      expect(result.user.password).toBeUndefined();
      expect(mockTokenManager.genLongToken).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'SUPERADMIN',
          schoolId: null,
        })
      );
    });

    it('should reject duplicate superadmin creation', async () => {
      // Create first superadmin
      await User.create({
        name: 'Existing Admin',
        email: 'existing@test.com',
        password: 'Password123',
        role: 'SUPERADMIN',
        schoolId: null,
      });

      const result = await userManager.setup({
        name: 'Another Admin',
        email: 'another@test.com',
        password: 'Password123',
        setupSecret: config.dotEnv.SETUP_SECRET,
      });

      expect(result.error).toBe('Superadmin already exists');
    });

    it('should reject invalid setup secret', async () => {
      const result = await userManager.setup({
        name: 'Super Admin',
        email: 'superadmin@test.com',
        password: 'Password123',
        setupSecret: 'wrong-secret',
      });

      expect(result.error).toBe('Invalid setup secret');
    });

    it('should validate required fields', async () => {
      const result = await userManager.setup({
        email: 'superadmin@test.com',
        setupSecret: config.dotEnv.SETUP_SECRET,
        // missing name, password
      });

      expect(result.error).toBe('Name, email, and password are required');
    });

    it('should validate password minimum length', async () => {
      const result = await userManager.setup({
        name: 'Super Admin',
        email: 'superadmin@test.com',
        password: 'short',
        setupSecret: config.dotEnv.SETUP_SECRET,
      });

      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should reject duplicate email', async () => {
      // Create first superadmin
      await userManager.setup({
        name: 'First Admin',
        email: 'admin@test.com',
        password: 'Password123',
        setupSecret: config.dotEnv.SETUP_SECRET,
      });

      // Clear superadmin status to test email uniqueness
      await User.deleteMany({});

      // Create user with same email
      await User.create({
        name: 'Existing User',
        email: 'admin@test.com',
        password: 'Password123',
        role: 'SCHOOL_ADMIN',
        schoolId: '507f1f77bcf86cd799439011', // dummy ObjectId
      });

      const result = await userManager.setup({
        name: 'Super Admin',
        email: 'admin@test.com',
        password: 'Password123',
        setupSecret: config.dotEnv.SETUP_SECRET,
      });

      expect(result.error).toBe('Email already in use');
    });
  });

  describe('login() - User Authentication', () => {
    beforeEach(async () => {
      // Create a test user
      await User.create({
        name: 'Test User',
        email: 'testuser@test.com',
        password: 'Password123',
        role: 'SUPERADMIN',
        schoolId: null,
      });
    });

    it('should login with valid credentials', async () => {
      const result = await userManager.login({
        email: 'testuser@test.com',
        password: 'Password123',
      });

      expect(result.error).toBeUndefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('testuser@test.com');
      expect(result.user.role).toBe('SUPERADMIN');
    });

    it('should reject invalid email', async () => {
      const result = await userManager.login({
        email: 'nonexistent@test.com',
        password: 'Password123',
      });

      expect(result.error).toBe('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const result = await userManager.login({
        email: 'testuser@test.com',
        password: 'WrongPassword123',
      });

      expect(result.error).toBe('Invalid email or password');
    });

    it('should validate required fields', async () => {
      const result = await userManager.login({
        email: 'testuser@test.com',
        // missing password
      });

      expect(result.error).toBe('Email and password are required');
    });
  });

  describe('profile() - Get User Profile', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Profile User',
        email: 'profile@test.com',
        password: 'Password123',
        role: 'SUPERADMIN',
        schoolId: null,
      });
    });

    it('should return user profile with valid auth', async () => {
      const result = await userManager.profile({
        __auth: {
          userId: testUser._id.toString(),
          role: testUser.role,
        },
      });

      expect(result.error).toBeUndefined();
      expect(result.email).toBe('profile@test.com');
      expect(result.role).toBe('SUPERADMIN');
      expect(result.name).toBe('Profile User');
    });

    it('should reject request without auth', async () => {
      const result = await userManager.profile({});

      expect(result.error).toBe('Authentication required');
    });

    it('should handle non-existent user', async () => {
      const result = await userManager.profile({
        __auth: {
          userId: '507f1f77bcf86cd799439011', // non-existent ObjectId
          role: 'SUPERADMIN',
        },
      });

      expect(result.error).toBe('User not found');
    });
  });

  describe('createSchoolAdmin() - Create School Administrator', () => {
    let superadmin;
    let testSchool;

    beforeEach(async () => {
      // Create superadmin
      superadmin = await User.create({
        name: 'Super Admin',
        email: 'superadmin@test.com',
        password: 'Password123',
        role: 'SUPERADMIN',
        schoolId: null,
      });

      // Create a school
      const School = require('../managers/entities/school/School.mongoModel');
      testSchool = await School.create({
        name: 'Test School',
        address: '123 Test Street',
        contactEmail: 'school@test.com',
        status: 'ACTIVE',
        createdBy: superadmin._id,
      });
    });

    it('should create school admin with valid data', async () => {
      const result = await userManager.createSchoolAdmin({
        __auth: {
          userId: superadmin._id.toString(),
          role: 'SUPERADMIN',
        },
        __superadmin: true,
        name: 'School Admin',
        email: 'schooladmin@test.com',
        password: 'Password123',
        schoolId: testSchool._id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.email).toBe('schooladmin@test.com');
      expect(result.role).toBe('SCHOOL_ADMIN');
      expect(result.schoolId.toString()).toBe(testSchool._id.toString());
    });

    it('should reject without superadmin auth', async () => {
      const result = await userManager.createSchoolAdmin({
        __auth: {
          userId: superadmin._id.toString(),
          role: 'SCHOOL_ADMIN',
        },
        name: 'School Admin',
        email: 'schooladmin@test.com',
        password: 'Password123',
        schoolId: testSchool._id.toString(),
      });

      expect(result.error).toBe('Superadmin authentication required');
    });

    it('should reject invalid school ID', async () => {
      const result = await userManager.createSchoolAdmin({
        __auth: {
          userId: superadmin._id.toString(),
          role: 'SUPERADMIN',
        },
        __superadmin: true,
        name: 'School Admin',
        email: 'schooladmin@test.com',
        password: 'Password123',
        schoolId: '507f1f77bcf86cd799439011', // non-existent
      });

      expect(result.error).toBe('School not found');
    });

    it('should reject duplicate email', async () => {
      // Create existing user
      await User.create({
        name: 'Existing User',
        email: 'existing@test.com',
        password: 'Password123',
        role: 'SCHOOL_ADMIN',
        schoolId: testSchool._id,
      });

      const result = await userManager.createSchoolAdmin({
        __auth: {
          userId: superadmin._id.toString(),
          role: 'SUPERADMIN',
        },
        __superadmin: true,
        name: 'School Admin',
        email: 'existing@test.com',
        password: 'Password123',
        schoolId: testSchool._id.toString(),
      });

      expect(result.error).toBe('Email already in use');
    });

    it('should validate required fields', async () => {
      const result = await userManager.createSchoolAdmin({
        __auth: {
          userId: superadmin._id.toString(),
          role: 'SUPERADMIN',
        },
        __superadmin: true,
        name: 'School Admin',
        email: 'schooladmin@test.com',
        // missing password and schoolId
      });

      expect(result.error).toBe('Name, email, password, and schoolId are required');
    });
  });
});
