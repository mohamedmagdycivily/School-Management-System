const request = require('supertest');
const jwt = require('jsonwebtoken');
const { User, School, Student, Classroom, ROLES } = require('../src/models');
const config = require('../src/config');

// Mock Redis and rate limiter before importing routes
require('./helpers/mockRedis');

// Create a minimal test app
const express = require('express');
const schoolRoutes = require('../src/routes/school.routes');
const studentRoutes = require('../src/routes/student.routes');
const classroomRoutes = require('../src/routes/classroom.routes');
const { errorHandler } = require('../src/middleware');

const app = express();
app.use(express.json());
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use(errorHandler);

// Helper function to generate token
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

describe('RBAC (Role-Based Access Control) Tests', () => {
  let superadmin;
  let superadminToken;
  let schoolA;
  let schoolB;
  let adminA;
  let adminB;
  let adminAToken;
  let adminBToken;
  let studentA;
  let studentB;
  let classroomA;
  let classroomB;

  beforeEach(async () => {
    // Create superadmin
    superadmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@test.com',
      password: 'Password123',
      role: ROLES.SUPERADMIN,
      schoolId: null,
    });
    superadminToken = generateToken(superadmin);

    // Create schools
    schoolA = await School.create({
      name: 'School A',
      contactEmail: 'schoola@test.com',
      createdBy: superadmin._id,
    });

    schoolB = await School.create({
      name: 'School B',
      contactEmail: 'schoolb@test.com',
      createdBy: superadmin._id,
    });

    // Create school admins
    adminA = await User.create({
      name: 'Admin A',
      email: 'admina@test.com',
      password: 'Password123',
      role: ROLES.SCHOOL_ADMIN,
      schoolId: schoolA._id,
    });
    adminAToken = generateToken(adminA);

    adminB = await User.create({
      name: 'Admin B',
      email: 'adminb@test.com',
      password: 'Password123',
      role: ROLES.SCHOOL_ADMIN,
      schoolId: schoolB._id,
    });
    adminBToken = generateToken(adminB);

    // Create classrooms
    classroomA = await Classroom.create({
      schoolId: schoolA._id,
      name: 'Classroom A',
      capacity: 30,
    });

    classroomB = await Classroom.create({
      schoolId: schoolB._id,
      name: 'Classroom B',
      capacity: 30,
    });

    // Create students
    studentA = await Student.create({
      schoolId: schoolA._id,
      classroomId: classroomA._id,
      firstName: 'Student',
      lastName: 'A',
      dob: new Date('2010-01-01'),
    });

    studentB = await Student.create({
      schoolId: schoolB._id,
      classroomId: classroomB._id,
      firstName: 'Student',
      lastName: 'B',
      dob: new Date('2010-01-01'),
    });
  });

  describe('Superadmin Access', () => {
    it('should allow superadmin to create a school', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'New School',
          contactEmail: 'newschool@test.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New School');
    });

    it('should allow superadmin to get all schools', async () => {
      const response = await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schools.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow superadmin to access any school\'s students', async () => {
      // Access School A's students
      const responseA = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${superadminToken}`)
        .query({ schoolId: schoolA._id.toString() });

      expect(responseA.status).toBe(200);
      expect(responseA.body.data.students.length).toBeGreaterThanOrEqual(1);

      // Access School B's students
      const responseB = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${superadminToken}`)
        .query({ schoolId: schoolB._id.toString() });

      expect(responseB.status).toBe(200);
      expect(responseB.body.data.students.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow superadmin to update any student', async () => {
      const response = await request(app)
        .put(`/api/students/${studentB._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          firstName: 'UpdatedBySuper',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('UpdatedBySuper');
    });
  });

  describe('School Admin Access - Own School', () => {
    it('should allow school admin to access their own school\'s students', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should only see their school's students
      const studentSchoolIds = response.body.data.students.map(
        (s) => s.schoolId._id || s.schoolId
      );
      studentSchoolIds.forEach((id) => {
        expect(id.toString()).toBe(schoolA._id.toString());
      });
    });

    it('should allow school admin to create students in their school', async () => {
      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          firstName: 'New',
          lastName: 'Student',
          dob: '2010-05-15',
          // Note: schoolId should be auto-injected
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schoolId.toString()).toBe(schoolA._id.toString());
    });

    it('should allow school admin to update their school\'s student', async () => {
      const response = await request(app)
        .put(`/api/students/${studentA._id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          firstName: 'UpdatedByAdmin',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('UpdatedByAdmin');
    });

    it('should allow school admin to create classrooms in their school', async () => {
      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          name: 'New Classroom',
          capacity: 25,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schoolId.toString()).toBe(schoolA._id.toString());
    });
  });

  describe('School Admin Access - Other School (DENIED)', () => {
    it('should DENY school admin A from accessing school B\'s students', async () => {
      // Try to get a specific student from School B
      const response = await request(app)
        .get(`/api/students/${studentB._id}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      // The student is not found because of the school filter
    });

    it('should DENY school admin A from updating school B\'s student', async () => {
      const response = await request(app)
        .put(`/api/students/${studentB._id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          firstName: 'Hacked',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('SCOPE_ACCESS_DENIED');
    });

    it('should DENY school admin A from deleting school B\'s student', async () => {
      const response = await request(app)
        .delete(`/api/students/${studentB._id}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('SCOPE_ACCESS_DENIED');
    });

    it('should DENY school admin A from updating school B\'s classroom', async () => {
      const response = await request(app)
        .put(`/api/classrooms/${classroomB._id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          name: 'Hacked Classroom',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('SCOPE_ACCESS_DENIED');
    });

    it('should filter out other school\'s students in list', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(response.status).toBe(200);
      
      // Should only contain School A's students
      const hasSchoolBStudents = response.body.data.students.some(
        (s) => (s.schoolId._id || s.schoolId).toString() === schoolB._id.toString()
      );
      expect(hasSchoolBStudents).toBe(false);
    });
  });

  describe('School Admin - Forbidden from School Management', () => {
    it('should DENY school admin from creating schools', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          name: 'Unauthorized School',
          contactEmail: 'unauth@test.com',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('RBAC_PERMISSION_DENIED');
    });

    it('should DENY school admin from listing all schools', async () => {
      const response = await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('RBAC_PERMISSION_DENIED');
    });

    it('should DENY school admin from deleting schools', async () => {
      const response = await request(app)
        .delete(`/api/schools/${schoolA._id}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('RBAC_PERMISSION_DENIED');
    });
  });

  describe('Unauthenticated Access', () => {
    it('should deny access without authentication token', async () => {
      const response = await request(app)
        .get('/api/students');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_TOKEN_REQUIRED');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Cross-School Resource Protection', () => {
    it('should prevent school admin from creating student with other school\'s classroom', async () => {
      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          firstName: 'Cross',
          lastName: 'School',
          dob: '2010-05-15',
          classroomId: classroomB._id.toString(), // Classroom from School B
        });

      // The student is created in School A (auto-injected), 
      // but with School B's classroom - should fail
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('STUDENT_CLASSROOM_SCHOOL_MISMATCH');
    });

    it('should prevent transferring student to classroom in different school', async () => {
      const response = await request(app)
        .put(`/api/students/${studentA._id}/transfer`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          classroomId: classroomB._id.toString(), // Classroom from School B
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('STUDENT_CLASSROOM_SCHOOL_MISMATCH');
    });
  });
});
