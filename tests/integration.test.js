/**
 * Integration Tests
 * Tests the full workflow from superadmin setup to student management
 * Uses the template's architecture pattern
 */
const mongoose = require('mongoose');
const User = require('../managers/entities/user/User.mongoModel');
const School = require('../managers/entities/school/School.mongoModel');
const Classroom = require('../managers/entities/classroom/Classroom.mongoModel');
const Student = require('../managers/entities/student/Student.mongoModel');
const config = require('../config/index.config');

// Managers
const UserManager = require('../managers/entities/user/User.manager');
const SchoolManager = require('../managers/entities/school/School.manager');
const ClassroomManager = require('../managers/entities/classroom/Classroom.manager');
const StudentManager = require('../managers/entities/student/Student.manager');

// Mock token manager
const mockTokenManager = {
  genLongToken: jest.fn(({ userId, userKey, role, schoolId }) => {
    return `mock-token-${userId}-${role}`;
  }),
  verifyLongToken: jest.fn(),
};

let userManager;
let schoolManager;
let classroomManager;
let studentManager;

beforeAll(() => {
  // Initialize managers
  userManager = new UserManager({
    config,
    managers: { token: mockTokenManager },
  });
  schoolManager = new SchoolManager({ config });
  classroomManager = new ClassroomManager({ config });
  studentManager = new StudentManager({ config });
});

describe('Integration Tests - Full Workflow', () => {
  // Shared state between tests
  let superadminData;
  let schoolData;
  let schoolAdminData;
  let classroomData;
  let studentData;

  // Cleanup after all tests in this suite
  afterAll(async () => {
    // Clear all collections after integration tests complete
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('Step 1: Superadmin Setup', () => {
    it('should create initial superadmin', async () => {
      const result = await userManager.setup({
        name: 'Super Admin',
        email: 'superadmin@school.com',
        password: 'SecurePass123!',
        setupSecret: config.dotEnv.SETUP_SECRET,
      });

      expect(result.error).toBeUndefined();
      expect(result.user.role).toBe('SUPERADMIN');
      expect(result.token).toBeDefined();

      superadminData = {
        ...result.user,
        token: result.token,
      };
    });
  });

  describe('Step 2: School Creation', () => {
    it('should create a school', async () => {
      const result = await schoolManager.create({
        __auth: { 
          userId: superadminData.id.toString(), 
          role: 'SUPERADMIN' 
        },
        __superadmin: true,
        name: 'Springfield Elementary',
        address: '742 Evergreen Terrace',
        contactEmail: 'contact@springfield-elementary.edu',
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('Springfield Elementary');

      schoolData = result;
    });

    it('should verify school was created', async () => {
      const result = await schoolManager.getById({
        __auth: { 
          userId: superadminData.id.toString(), 
          role: 'SUPERADMIN' 
        },
        __superadmin: true,
        schoolId: schoolData.id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('Springfield Elementary');
    });
  });

  describe('Step 3: School Admin Creation', () => {
    it('should create a school admin for the school', async () => {
      const result = await userManager.createSchoolAdmin({
        __auth: { 
          userId: superadminData.id.toString(), 
          role: 'SUPERADMIN' 
        },
        __superadmin: true,
        name: 'Principal Skinner',
        email: 'skinner@springfield-elementary.edu',
        password: 'SecurePass123!',
        schoolId: schoolData.id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.role).toBe('SCHOOL_ADMIN');
      expect(result.schoolId.toString()).toBe(schoolData.id.toString());

      schoolAdminData = result;
    });

    it('should verify school admin can login', async () => {
      const result = await userManager.login({
        email: 'skinner@springfield-elementary.edu',
        password: 'SecurePass123!',
      });

      expect(result.error).toBeUndefined();
      expect(result.user.role).toBe('SCHOOL_ADMIN');
      expect(result.token).toBeDefined();

      schoolAdminData.token = result.token;
    });
  });

  describe('Step 4: Classroom Management', () => {
    it('school admin should create a classroom', async () => {
      const result = await classroomManager.create({
        __auth: { 
          userId: schoolAdminData.id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: schoolData.id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: schoolData.id.toString(), 
          isSuperadmin: false 
        },
        name: 'Grade 4 - Class A',
        capacity: 30,
        resources: ['Projector', 'Whiteboard', 'Computers'],
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('Grade 4 - Class A');
      expect(result.capacity).toBe(30);

      classroomData = result;
    });

    it('should verify classroom was created', async () => {
      const result = await classroomManager.getById({
        __auth: { 
          userId: schoolAdminData.id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: schoolData.id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: schoolData.id.toString(), 
          isSuperadmin: false 
        },
        classroomId: classroomData.id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('Grade 4 - Class A');
      expect(result.resources).toContain('Projector');
    });

    it('superadmin should also be able to see the classroom', async () => {
      const result = await classroomManager.getById({
        __auth: { 
          userId: superadminData.id.toString(), 
          role: 'SUPERADMIN',
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: null, 
          isSuperadmin: true 
        },
        classroomId: classroomData.id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('Grade 4 - Class A');
    });
  });

  describe('Step 5: Student Enrollment', () => {
    it('school admin should enroll a student', async () => {
      const result = await studentManager.enroll({
        __auth: { 
          userId: schoolAdminData.id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: schoolData.id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: schoolData.id.toString(), 
          isSuperadmin: false 
        },
        firstName: 'Bart',
        lastName: 'Simpson',
        dob: '2014-04-01',
        email: 'bart@students.springfield.edu',
        classroomId: classroomData.id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.firstName).toBe('Bart');
      expect(result.lastName).toBe('Simpson');
      expect(result.status).toBe('ENROLLED');

      studentData = result;
    });

    it('should verify student was enrolled', async () => {
      const result = await studentManager.getById({
        __auth: { 
          userId: schoolAdminData.id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: schoolData.id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: schoolData.id.toString(), 
          isSuperadmin: false 
        },
        studentId: studentData.id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.firstName).toBe('Bart');
      expect(result.classroomId.toString()).toBe(classroomData.id.toString());
    });

    it('should list students in the school', async () => {
      const result = await studentManager.list({
        __auth: { 
          userId: schoolAdminData.id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: schoolData.id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: schoolData.id.toString(), 
          isSuperadmin: false 
        },
      });

      expect(result.error).toBeUndefined();
      expect(result.students.length).toBe(1);
      expect(result.students[0].firstName).toBe('Bart');
    });
  });

  describe('Step 6: Student Update', () => {
    it('should update student status', async () => {
      const result = await studentManager.update({
        __auth: { 
          userId: schoolAdminData.id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: schoolData.id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: schoolData.id.toString(), 
          isSuperadmin: false 
        },
        studentId: studentData.id.toString(),
        email: 'bart.simpson@students.springfield.edu',
      });

      expect(result.error).toBeUndefined();
      expect(result.email).toBe('bart.simpson@students.springfield.edu');
    });
  });

  describe('Step 7: Cross-School Isolation Test', () => {
    let otherSchool;
    let otherSchoolAdmin;

    beforeAll(async () => {
      // Create another school
      otherSchool = await School.create({
        name: 'Shelbyville Elementary',
        address: '123 Shelbyville Road',
        contactEmail: 'contact@shelbyville.edu',
        status: 'ACTIVE',
        createdBy: superadminData.id,
      });

      // Create admin for the other school
      otherSchoolAdmin = await User.create({
        name: 'Other Admin',
        email: 'admin@shelbyville.edu',
        password: 'SecurePass123!',
        role: 'SCHOOL_ADMIN',
        schoolId: otherSchool._id,
      });
    });

    it('other school admin CANNOT see Springfield students', async () => {
      const result = await studentManager.list({
        __auth: { 
          userId: otherSchoolAdmin._id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: otherSchool._id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: otherSchool._id.toString(), 
          isSuperadmin: false 
        },
      });

      expect(result.error).toBeUndefined();
      expect(result.students.length).toBe(0); // Should see no students
    });

    it('other school admin CANNOT access Springfield student directly', async () => {
      const result = await studentManager.getById({
        __auth: { 
          userId: otherSchoolAdmin._id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: otherSchool._id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: otherSchool._id.toString(), 
          isSuperadmin: false 
        },
        studentId: studentData.id.toString(),
      });

      expect(result.error).toBe('Access denied. Student belongs to a different school.');
    });
  });

  describe('Step 8: Student Transfer (Superadmin Only)', () => {
    let targetSchool;

    beforeAll(async () => {
      targetSchool = await School.create({
        name: 'Capital City Elementary',
        address: '456 Capital City',
        contactEmail: 'contact@capitalcity.edu',
        status: 'ACTIVE',
        createdBy: superadminData.id,
      });
    });

    it('superadmin should transfer student to another school', async () => {
      const result = await studentManager.transfer({
        __auth: { 
          userId: superadminData.id.toString(), 
          role: 'SUPERADMIN',
        },
        __superadmin: true,
        studentId: studentData.id.toString(),
        targetSchoolId: targetSchool._id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe('TRANSFERRED');
      expect(result.newSchoolId.toString()).toBe(targetSchool._id.toString());
    });

    it('original school admin should no longer see transferred student', async () => {
      const result = await studentManager.list({
        __auth: { 
          userId: schoolAdminData.id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: schoolData.id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: schoolData.id.toString(), 
          isSuperadmin: false 
        },
      });

      expect(result.error).toBeUndefined();
      expect(result.students.length).toBe(0); // Student was transferred out
    });
  });

  describe('Step 9: Cleanup Operations', () => {
    it('school admin should be able to delete their classroom', async () => {
      const result = await classroomManager.delete({
        __auth: { 
          userId: schoolAdminData.id.toString(), 
          role: 'SCHOOL_ADMIN',
          schoolId: schoolData.id.toString(),
        },
        __schoolAdmin: true,
        __schoolScope: { 
          schoolId: schoolData.id.toString(), 
          isSuperadmin: false 
        },
        classroomId: classroomData.id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.message).toContain('deleted successfully');
    });

    it('superadmin should be able to delete school', async () => {
      const result = await schoolManager.delete({
        __auth: { 
          userId: superadminData.id.toString(), 
          role: 'SUPERADMIN',
        },
        __superadmin: true,
        schoolId: schoolData.id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.message).toContain('deleted successfully');
    });
  });
});

describe('Integration Tests - Validation', () => {
  let superadmin;

  beforeAll(async () => {
    superadmin = await User.create({
      name: 'Validation Test Admin',
      email: 'validation-admin@test.com',
      password: 'Password123',
      role: 'SUPERADMIN',
      schoolId: null,
    });
  });

  describe('School Validation', () => {
    it('should reject school with duplicate name', async () => {
      // Create first school
      await schoolManager.create({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __superadmin: true,
        name: 'Unique School',
        address: '123 First Street',
        contactEmail: 'first@test.com',
      });

      // Try to create duplicate
      const result = await schoolManager.create({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __superadmin: true,
        name: 'Unique School',
        address: '456 Second Street',
        contactEmail: 'second@test.com',
      });

      expect(result.error).toBe('School name already exists');
    });

    it('should validate required fields', async () => {
      const result = await schoolManager.create({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __superadmin: true,
        name: 'Missing Fields School',
        // missing address and contactEmail
      });

      expect(result.error).toBe('Name, address, and contactEmail are required');
    });
  });

  describe('Classroom Validation', () => {
    let school;

    beforeAll(async () => {
      school = await School.create({
        name: 'Validation School',
        address: '123 Validation Street',
        contactEmail: 'validation@test.com',
        status: 'ACTIVE',
        createdBy: superadmin._id,
      });
    });

    it('should reject classroom with duplicate name in same school', async () => {
      // Create first classroom
      await Classroom.create({
        schoolId: school._id,
        name: 'Room 101',
        capacity: 30,
      });

      // Try to create duplicate
      const result = await classroomManager.create({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __schoolAdmin: true,
        __schoolScope: { schoolId: null, isSuperadmin: true },
        schoolId: school._id.toString(),
        name: 'Room 101',
        capacity: 25,
      });

      expect(result.error).toBe('Classroom name already exists in this school');
    });

    it('should validate capacity limits', async () => {
      const result = await classroomManager.create({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __schoolAdmin: true,
        __schoolScope: { schoolId: null, isSuperadmin: true },
        schoolId: school._id.toString(),
        name: 'Invalid Capacity Room',
        capacity: 0, // Invalid - minimum is 1
      });

      // Should fail due to mongoose validation
      expect(result.error).toBeDefined();
    });
  });
});
