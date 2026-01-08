const jwt = require('jsonwebtoken');
const { User, School, Classroom, Student, ROLES } = require('../../src/models');
const config = require('../../src/config');

/**
 * Create a test superadmin user
 */
const createSuperadmin = async (overrides = {}) => {
  const userData = {
    name: 'Super Admin',
    email: 'superadmin@test.com',
    password: 'Password123',
    role: ROLES.SUPERADMIN,
    schoolId: null,
    ...overrides,
  };

  const user = await User.create(userData);
  return user;
};

/**
 * Create a test school
 */
const createSchool = async (createdBy, overrides = {}) => {
  const schoolData = {
    name: `Test School ${Date.now()}`,
    contactEmail: 'school@test.com',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country',
    },
    status: 'ACTIVE',
    createdBy,
    ...overrides,
  };

  const school = await School.create(schoolData);
  return school;
};

/**
 * Create a test school admin
 */
const createSchoolAdmin = async (schoolId, overrides = {}) => {
  const userData = {
    name: 'School Admin',
    email: `schooladmin${Date.now()}@test.com`,
    password: 'Password123',
    role: ROLES.SCHOOL_ADMIN,
    schoolId,
    ...overrides,
  };

  const user = await User.create(userData);
  return user;
};

/**
 * Create a test classroom
 */
const createClassroom = async (schoolId, overrides = {}) => {
  const classroomData = {
    schoolId,
    name: `Classroom ${Date.now()}`,
    capacity: 30,
    resources: ['Projector', 'Whiteboard'],
    floor: 1,
    building: 'Main Building',
    isActive: true,
    ...overrides,
  };

  const classroom = await Classroom.create(classroomData);
  return classroom;
};

/**
 * Create a test student
 */
const createStudent = async (schoolId, classroomId = null, overrides = {}) => {
  const studentData = {
    schoolId,
    classroomId,
    firstName: 'John',
    lastName: `Doe${Date.now()}`,
    dob: new Date('2010-05-15'),
    gender: 'MALE',
    status: 'ENROLLED',
    ...overrides,
  };

  const student = await Student.create(studentData);
  return student;
};

/**
 * Generate JWT token for a user
 */
const generateTestToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

/**
 * Create auth header with token
 */
const authHeader = (token) => {
  return { Authorization: `Bearer ${token}` };
};

/**
 * Setup test data with superadmin, schools, admins, classrooms, and students
 */
const setupTestData = async () => {
  // Create superadmin
  const superadmin = await createSuperadmin();
  const superadminToken = generateTestToken(superadmin);

  // Create two schools
  const schoolA = await createSchool(superadmin._id, { name: 'School A' });
  const schoolB = await createSchool(superadmin._id, { name: 'School B' });

  // Create school admins
  const adminA = await createSchoolAdmin(schoolA._id, { email: 'admina@test.com' });
  const adminB = await createSchoolAdmin(schoolB._id, { email: 'adminb@test.com' });

  const adminAToken = generateTestToken(adminA);
  const adminBToken = generateTestToken(adminB);

  // Create classrooms
  const classroomA = await createClassroom(schoolA._id, { name: 'Classroom A' });
  const classroomB = await createClassroom(schoolB._id, { name: 'Classroom B' });

  // Create students
  const studentA = await createStudent(schoolA._id, classroomA._id, { firstName: 'Student A' });
  const studentB = await createStudent(schoolB._id, classroomB._id, { firstName: 'Student B' });

  return {
    superadmin,
    superadminToken,
    schoolA,
    schoolB,
    adminA,
    adminB,
    adminAToken,
    adminBToken,
    classroomA,
    classroomB,
    studentA,
    studentB,
  };
};

module.exports = {
  createSuperadmin,
  createSchool,
  createSchoolAdmin,
  createClassroom,
  createStudent,
  generateTestToken,
  authHeader,
  setupTestData,
};
