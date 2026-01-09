/**
 * RBAC (Role-Based Access Control) Tests
 * Tests that SUPERADMIN has full access and SCHOOL_ADMIN is scoped to their school
 * Uses the template's architecture pattern
 */
const User = require('../managers/entities/user/User.mongoModel');
const School = require('../managers/entities/school/School.mongoModel');
const Classroom = require('../managers/entities/classroom/Classroom.mongoModel');
const Student = require('../managers/entities/student/Student.mongoModel');
const config = require('../config/index.config');

// Managers
const SchoolManager = require('../managers/entities/school/School.manager');
const ClassroomManager = require('../managers/entities/classroom/Classroom.manager');
const StudentManager = require('../managers/entities/student/Student.manager');

let schoolManager;
let classroomManager;
let studentManager;

// Test data
let superadmin;
let schoolAdminA;
let schoolAdminB;
let schoolA;
let schoolB;

beforeAll(() => {
  // Initialize managers
  schoolManager = new SchoolManager({ config });
  classroomManager = new ClassroomManager({ config });
  studentManager = new StudentManager({ config });
});

beforeEach(async () => {
  // Create superadmin
  superadmin = await User.create({
    name: 'Super Admin',
    email: 'superadmin@test.com',
    password: 'Password123',
    role: 'SUPERADMIN',
    schoolId: null,
  });

  // Create School A
  schoolA = await School.create({
    name: 'School A',
    address: '123 School A Street',
    contactEmail: 'schoola@test.com',
    status: 'ACTIVE',
    createdBy: superadmin._id,
  });

  // Create School B
  schoolB = await School.create({
    name: 'School B',
    address: '456 School B Street',
    contactEmail: 'schoolb@test.com',
    status: 'ACTIVE',
    createdBy: superadmin._id,
  });

  // Create School Admin A (assigned to School A)
  schoolAdminA = await User.create({
    name: 'School Admin A',
    email: 'adminA@test.com',
    password: 'Password123',
    role: 'SCHOOL_ADMIN',
    schoolId: schoolA._id,
  });

  // Create School Admin B (assigned to School B)
  schoolAdminB = await User.create({
    name: 'School Admin B',
    email: 'adminB@test.com',
    password: 'Password123',
    role: 'SCHOOL_ADMIN',
    schoolId: schoolB._id,
  });
});

describe('RBAC - Superadmin Access', () => {
  describe('School Management', () => {
    it('SUPERADMIN can create a school', async () => {
      const result = await schoolManager.create({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __superadmin: true,
        name: 'New School',
        address: '789 New Street',
        contactEmail: 'newschool@test.com',
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('New School');
    });

    it('SUPERADMIN can list all schools', async () => {
      const result = await schoolManager.list({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __superadmin: true,
      });

      expect(result.error).toBeUndefined();
      expect(result.schools.length).toBe(2);
    });

    it('SUPERADMIN can update any school', async () => {
      const result = await schoolManager.update({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __superadmin: true,
        schoolId: schoolA._id.toString(),
        name: 'Updated School A',
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('Updated School A');
    });

    it('SUPERADMIN can delete any school', async () => {
      const result = await schoolManager.delete({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __superadmin: true,
        schoolId: schoolA._id.toString(),
      });

      expect(result.error).toBeUndefined();
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('Classroom Management', () => {
    it('SUPERADMIN can create classroom in any school', async () => {
      const result = await classroomManager.create({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __schoolAdmin: true,
        __schoolScope: { schoolId: null, isSuperadmin: true },
        schoolId: schoolA._id.toString(),
        name: 'Class 1A',
        capacity: 30,
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('Class 1A');
      expect(result.schoolId.toString()).toBe(schoolA._id.toString());
    });

    it('SUPERADMIN can list classrooms from any school', async () => {
      // Create classrooms in both schools
      await Classroom.create({
        schoolId: schoolA._id,
        name: 'Class A1',
        capacity: 30,
      });
      await Classroom.create({
        schoolId: schoolB._id,
        name: 'Class B1',
        capacity: 25,
      });

      const result = await classroomManager.list({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __schoolAdmin: true,
        __schoolScope: { schoolId: null, isSuperadmin: true },
      });

      expect(result.error).toBeUndefined();
      expect(result.classrooms.length).toBe(2);
    });
  });

  describe('Student Management', () => {
    it('SUPERADMIN can enroll student in any school', async () => {
      const result = await studentManager.enroll({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __schoolAdmin: true,
        __schoolScope: { schoolId: null, isSuperadmin: true },
        schoolId: schoolB._id.toString(),
        firstName: 'John',
        lastName: 'Doe',
        dob: '2010-05-15',
      });

      expect(result.error).toBeUndefined();
      expect(result.firstName).toBe('John');
      expect(result.schoolId.toString()).toBe(schoolB._id.toString());
    });

    it('SUPERADMIN can list students from any school', async () => {
      // Create students in both schools
      await Student.create({
        schoolId: schoolA._id,
        firstName: 'Alice',
        lastName: 'Smith',
        dob: new Date('2010-01-01'),
      });
      await Student.create({
        schoolId: schoolB._id,
        firstName: 'Bob',
        lastName: 'Jones',
        dob: new Date('2011-02-02'),
      });

      const result = await studentManager.list({
        __auth: { userId: superadmin._id.toString(), role: 'SUPERADMIN' },
        __schoolAdmin: true,
        __schoolScope: { schoolId: null, isSuperadmin: true },
      });

      expect(result.error).toBeUndefined();
      expect(result.students.length).toBe(2);
    });
  });
});

describe('RBAC - School Admin Scoping', () => {
  describe('Classroom Management', () => {
    it('SCHOOL_ADMIN can create classroom in their own school', async () => {
      const result = await classroomManager.create({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
        name: 'My Class',
        capacity: 25,
      });

      expect(result.error).toBeUndefined();
      expect(result.name).toBe('My Class');
      expect(result.schoolId.toString()).toBe(schoolA._id.toString());
    });

    it('SCHOOL_ADMIN can only see classrooms from their school', async () => {
      // Create classrooms in both schools
      await Classroom.create({
        schoolId: schoolA._id,
        name: 'Class A1',
        capacity: 30,
      });
      await Classroom.create({
        schoolId: schoolB._id,
        name: 'Class B1',
        capacity: 25,
      });

      const result = await classroomManager.list({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
      });

      expect(result.error).toBeUndefined();
      expect(result.classrooms.length).toBe(1);
      expect(result.classrooms[0].name).toBe('Class A1');
    });

    it('SCHOOL_ADMIN CANNOT access classroom from another school', async () => {
      // Create classroom in School B
      const classroomB = await Classroom.create({
        schoolId: schoolB._id,
        name: 'Class B1',
        capacity: 25,
      });

      const result = await classroomManager.getById({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
        classroomId: classroomB._id.toString(),
      });

      expect(result.error).toBe('Access denied. Classroom belongs to a different school.');
    });

    it('SCHOOL_ADMIN CANNOT update classroom from another school', async () => {
      // Create classroom in School B
      const classroomB = await Classroom.create({
        schoolId: schoolB._id,
        name: 'Class B1',
        capacity: 25,
      });

      const result = await classroomManager.update({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
        classroomId: classroomB._id.toString(),
        name: 'Hacked Class',
      });

      expect(result.error).toBe('Access denied. Classroom belongs to a different school.');
    });

    it('SCHOOL_ADMIN CANNOT delete classroom from another school', async () => {
      // Create classroom in School B
      const classroomB = await Classroom.create({
        schoolId: schoolB._id,
        name: 'Class B1',
        capacity: 25,
      });

      const result = await classroomManager.delete({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
        classroomId: classroomB._id.toString(),
      });

      expect(result.error).toBe('Access denied. Classroom belongs to a different school.');
    });
  });

  describe('Student Management', () => {
    it('SCHOOL_ADMIN can enroll student in their own school', async () => {
      const result = await studentManager.enroll({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
        firstName: 'Jane',
        lastName: 'Doe',
        dob: '2012-03-20',
      });

      expect(result.error).toBeUndefined();
      expect(result.firstName).toBe('Jane');
      expect(result.schoolId.toString()).toBe(schoolA._id.toString());
    });

    it('SCHOOL_ADMIN can only see students from their school', async () => {
      // Create students in both schools
      await Student.create({
        schoolId: schoolA._id,
        firstName: 'Alice',
        lastName: 'Smith',
        dob: new Date('2010-01-01'),
      });
      await Student.create({
        schoolId: schoolB._id,
        firstName: 'Bob',
        lastName: 'Jones',
        dob: new Date('2011-02-02'),
      });

      const result = await studentManager.list({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
      });

      expect(result.error).toBeUndefined();
      expect(result.students.length).toBe(1);
      expect(result.students[0].firstName).toBe('Alice');
    });

    it('SCHOOL_ADMIN CANNOT access student from another school', async () => {
      // Create student in School B
      const studentB = await Student.create({
        schoolId: schoolB._id,
        firstName: 'Bob',
        lastName: 'Jones',
        dob: new Date('2011-02-02'),
      });

      const result = await studentManager.getById({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
        studentId: studentB._id.toString(),
      });

      expect(result.error).toBe('Access denied. Student belongs to a different school.');
    });

    it('SCHOOL_ADMIN CANNOT update student from another school', async () => {
      // Create student in School B
      const studentB = await Student.create({
        schoolId: schoolB._id,
        firstName: 'Bob',
        lastName: 'Jones',
        dob: new Date('2011-02-02'),
      });

      const result = await studentManager.update({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
        studentId: studentB._id.toString(),
        firstName: 'Hacked Name',
      });

      expect(result.error).toBe('Access denied. Student belongs to a different school.');
    });

    it('SCHOOL_ADMIN CANNOT delete student from another school', async () => {
      // Create student in School B
      const studentB = await Student.create({
        schoolId: schoolB._id,
        firstName: 'Bob',
        lastName: 'Jones',
        dob: new Date('2011-02-02'),
      });

      const result = await studentManager.delete({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
        studentId: studentB._id.toString(),
      });

      expect(result.error).toBe('Access denied. Student belongs to a different school.');
    });
  });

  describe('Cross-School Isolation', () => {
    it('School Admin A cannot see School Admin B data', async () => {
      // Create data for School A and School B
      await Classroom.create({ schoolId: schoolA._id, name: 'Class A', capacity: 30 });
      await Student.create({ schoolId: schoolA._id, firstName: 'Student', lastName: 'A', dob: new Date() });
      
      await Classroom.create({ schoolId: schoolB._id, name: 'Class B', capacity: 25 });
      await Student.create({ schoolId: schoolB._id, firstName: 'Student', lastName: 'B', dob: new Date() });

      // Admin A lists classrooms
      const classroomsA = await classroomManager.list({
        __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolA._id.toString(), isSuperadmin: false },
      });

      // Admin B lists classrooms
      const classroomsB = await classroomManager.list({
        __auth: { userId: schoolAdminB._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolB._id.toString() },
        __schoolAdmin: true,
        __schoolScope: { schoolId: schoolB._id.toString(), isSuperadmin: false },
      });

      // Admin A only sees School A data
      expect(classroomsA.classrooms.length).toBe(1);
      expect(classroomsA.classrooms[0].name).toBe('Class A');

      // Admin B only sees School B data
      expect(classroomsB.classrooms.length).toBe(1);
      expect(classroomsB.classrooms[0].name).toBe('Class B');
    });
  });
});

describe('RBAC - School Admin CANNOT Access School Management', () => {
  it('SCHOOL_ADMIN cannot create schools', async () => {
    const result = await schoolManager.create({
      __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
      name: 'Unauthorized School',
      address: '999 Unauthorized Street',
      contactEmail: 'unauth@test.com',
    });

    expect(result.error).toBe('Superadmin authentication required');
  });

  it('SCHOOL_ADMIN cannot list all schools', async () => {
    const result = await schoolManager.list({
      __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
    });

    expect(result.error).toBe('Superadmin authentication required');
  });

  it('SCHOOL_ADMIN cannot delete schools', async () => {
    const result = await schoolManager.delete({
      __auth: { userId: schoolAdminA._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolA._id.toString() },
      schoolId: schoolA._id.toString(),
    });

    expect(result.error).toBe('Superadmin authentication required');
  });
});
