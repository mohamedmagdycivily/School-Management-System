const request = require('supertest');
const jwt = require('jsonwebtoken');
const { User, School, Student, Classroom, ROLES } = require('../src/models');
const config = require('../src/config');

// Mock Redis and rate limiter before importing routes
require('./helpers/mockRedis');

// Create test app
const express = require('express');
const routes = require('../src/routes');
const { errorHandler, notFoundHandler } = require('../src/middleware');

const app = express();
app.use(express.json());
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Integration Tests - Full Workflow', () => {
  describe('Complete School Management Workflow', () => {
    it('should complete the full school management workflow', async () => {
      // Step 1: Setup superadmin account
      const setupResponse = await request(app)
        .post('/api/auth/setup')
        .send({
          name: 'Super Admin',
          email: 'super@test.com',
          password: 'Password123',
          setupSecret: config.SETUP_SECRET,
        });

      expect(setupResponse.status).toBe(201);
      expect(setupResponse.body.success).toBe(true);
      const superadminToken = setupResponse.body.data.token;

      // Step 2: Superadmin creates a school
      const createSchoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Integration Test School',
          contactEmail: 'school@test.com',
          address: {
            street: '123 Main St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'Test Country',
          },
        });

      expect(createSchoolResponse.status).toBe(201);
      expect(createSchoolResponse.body.success).toBe(true);
      const schoolId = createSchoolResponse.body.data._id;

      // Step 3: Superadmin creates a school admin for that school
      const createAdminResponse = await request(app)
        .post(`/api/schools/${schoolId}/admin`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'School Admin',
          email: 'schooladmin@test.com',
          password: 'Password123',
        });

      expect(createAdminResponse.status).toBe(201);
      expect(createAdminResponse.body.success).toBe(true);
      expect(createAdminResponse.body.data.schoolId.toString()).toBe(schoolId);

      // Step 4: School admin logs in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'schooladmin@test.com',
          password: 'Password123',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.role).toBe(ROLES.SCHOOL_ADMIN);
      const schoolAdminToken = loginResponse.body.data.token;

      // Step 5: School admin creates a classroom
      const createClassroomResponse = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Grade 5 - Room A',
          capacity: 30,
          resources: ['Projector', 'Whiteboard', 'Computers'],
          floor: 2,
          building: 'Main Building',
        });

      expect(createClassroomResponse.status).toBe(201);
      expect(createClassroomResponse.body.success).toBe(true);
      expect(createClassroomResponse.body.data.schoolId.toString()).toBe(schoolId);
      const classroomId = createClassroomResponse.body.data._id;

      // Step 6: School admin enrolls a student
      const enrollStudentResponse = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dob: '2015-03-15',
          gender: 'MALE',
          classroomId: classroomId,
          guardianInfo: {
            name: 'Jane Doe',
            relationship: 'Mother',
            phone: '+1234567890',
            email: 'jane.doe@test.com',
          },
        });

      expect(enrollStudentResponse.status).toBe(201);
      expect(enrollStudentResponse.body.success).toBe(true);
      expect(enrollStudentResponse.body.data.schoolId.toString()).toBe(schoolId);
      expect(enrollStudentResponse.body.data.classroomId.toString()).toBe(classroomId);
      const studentId = enrollStudentResponse.body.data._id;

      // Step 7: School admin views their students
      const listStudentsResponse = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(listStudentsResponse.status).toBe(200);
      expect(listStudentsResponse.body.success).toBe(true);
      expect(listStudentsResponse.body.data.students.length).toBeGreaterThanOrEqual(1);

      // Step 8: School admin updates student
      const updateStudentResponse = await request(app)
        .put(`/api/students/${studentId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          phone: '+0987654321',
          notes: 'Excellent student',
        });

      expect(updateStudentResponse.status).toBe(200);
      expect(updateStudentResponse.body.success).toBe(true);
      expect(updateStudentResponse.body.data.notes).toBe('Excellent student');

      // Step 9: Superadmin can view all data
      const schoolsResponse = await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(schoolsResponse.status).toBe(200);
      expect(schoolsResponse.body.data.schools.length).toBeGreaterThanOrEqual(1);

      const studentsResponse = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(studentsResponse.status).toBe(200);

      // Step 10: Get student statistics
      const statsResponse = await request(app)
        .get('/api/students/stats')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.enrolled).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    let superadminToken;

    beforeEach(async () => {
      const superadmin = await User.create({
        name: 'Super Admin',
        email: 'errortest@test.com',
        password: 'Password123',
        role: ROLES.SUPERADMIN,
        schoolId: null,
      });
      superadminToken = generateToken(superadmin);
    });

    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/undefined-route')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should return 404 for non-existent resource', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/schools/${fakeId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/api/schools/invalid-id')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate school name', async () => {
      const user = await User.findOne({ email: 'errortest@test.com' });
      await School.create({
        name: 'Duplicate School',
        contactEmail: 'dup@test.com',
        createdBy: user._id,
      });

      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Duplicate School',
          contactEmail: 'another@test.com',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('SCHOOL_DUPLICATE_NAME');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('running');
      expect(response.body.uptime).toBeDefined();
    });
  });
});
