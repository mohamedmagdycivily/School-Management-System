const { Student, School, Classroom } = require('../models');
const { ApiError } = require('../middleware/errorHandler.middleware');

class StudentService {
  /**
   * Create (enroll) a new student
   * @param {Object} data - Student data
   * @returns {Object} Created student
   */
  async createStudent(data) {
    // Verify school exists
    const school = await School.findById(data.schoolId);

    if (!school) {
      throw new ApiError(404, 'School not found', 'STUDENT_SCHOOL_NOT_FOUND');
    }

    // Verify classroom exists and belongs to the school (if provided)
    if (data.classroomId) {
      const classroom = await Classroom.findById(data.classroomId);

      if (!classroom) {
        throw new ApiError(404, 'Classroom not found', 'STUDENT_CLASSROOM_NOT_FOUND');
      }

      if (classroom.schoolId.toString() !== data.schoolId.toString()) {
        throw new ApiError(400, 'Classroom does not belong to the specified school', 'STUDENT_CLASSROOM_SCHOOL_MISMATCH');
      }

      // Check classroom capacity
      const currentStudents = await Student.countDocuments({
        classroomId: data.classroomId,
        status: 'ENROLLED',
      });

      if (currentStudents >= classroom.capacity) {
        throw new ApiError(400, 'Classroom is at full capacity', 'STUDENT_CLASSROOM_FULL');
      }
    }

    const student = await Student.create(data);

    return student;
  }

  /**
   * Get all students with pagination and school filter
   * @param {Object} query - Query parameters
   * @param {Object} schoolFilter - School filter from scope middleware
   * @returns {Object} Students list with pagination info
   */
  async getAllStudents(query, schoolFilter = {}) {
    const {
      page = 1,
      limit = 10,
      classroomId,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = { ...schoolFilter };

    if (classroomId) {
      filter.classroomId = classroomId;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('schoolId', 'name')
        .populate('classroomId', 'name capacity')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Student.countDocuments(filter),
    ]);

    return {
      students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get student by ID
   * @param {string} studentId - Student ID
   * @param {Object} schoolFilter - School filter from scope middleware
   * @returns {Object} Student data
   */
  async getStudentById(studentId, schoolFilter = {}) {
    const filter = { _id: studentId, ...schoolFilter };
    const student = await Student.findOne(filter)
      .populate('schoolId', 'name status contactEmail')
      .populate('classroomId', 'name capacity building floor');

    if (!student) {
      throw new ApiError(404, 'Student not found', 'STUDENT_NOT_FOUND');
    }

    return student;
  }

  /**
   * Update student
   * @param {string} studentId - Student ID
   * @param {Object} data - Update data
   * @param {Object} resource - Pre-fetched resource from scope middleware
   * @returns {Object} Updated student
   */
  async updateStudent(studentId, data, resource = null) {
    const student = resource || await Student.findById(studentId);

    if (!student) {
      throw new ApiError(404, 'Student not found', 'STUDENT_NOT_FOUND');
    }

    // Verify classroom if being updated
    if (data.classroomId && data.classroomId !== student.classroomId?.toString()) {
      const classroom = await Classroom.findById(data.classroomId);

      if (!classroom) {
        throw new ApiError(404, 'Classroom not found', 'STUDENT_CLASSROOM_NOT_FOUND');
      }

      if (classroom.schoolId.toString() !== student.schoolId.toString()) {
        throw new ApiError(400, 'Classroom does not belong to the student\'s school', 'STUDENT_CLASSROOM_SCHOOL_MISMATCH');
      }

      // Check classroom capacity (excluding current student)
      const currentStudents = await Student.countDocuments({
        classroomId: data.classroomId,
        status: 'ENROLLED',
        _id: { $ne: studentId },
      });

      if (currentStudents >= classroom.capacity) {
        throw new ApiError(400, 'Classroom is at full capacity', 'STUDENT_CLASSROOM_FULL');
      }
    }

    // Handle graduation date when status changes to GRADUATED
    if (data.status === 'GRADUATED' && student.status !== 'GRADUATED') {
      data.graduationDate = data.graduationDate || new Date();
    }

    Object.assign(student, data);
    await student.save();

    return student;
  }

  /**
   * Delete student
   * @param {string} studentId - Student ID
   * @param {Object} resource - Pre-fetched resource from scope middleware
   */
  async deleteStudent(studentId, resource = null) {
    const student = resource || await Student.findById(studentId);

    if (!student) {
      throw new ApiError(404, 'Student not found', 'STUDENT_NOT_FOUND');
    }

    await Student.findByIdAndDelete(studentId);

    return { message: 'Student deleted successfully' };
  }

  /**
   * Transfer student to another classroom
   * @param {string} studentId - Student ID
   * @param {string} newClassroomId - New classroom ID
   * @param {Object} resource - Pre-fetched resource from scope middleware
   * @returns {Object} Updated student
   */
  async transferStudent(studentId, newClassroomId, resource = null) {
    const student = resource || await Student.findById(studentId);

    if (!student) {
      throw new ApiError(404, 'Student not found', 'STUDENT_NOT_FOUND');
    }

    if (student.status !== 'ENROLLED') {
      throw new ApiError(400, 'Only enrolled students can be transferred', 'STUDENT_NOT_ENROLLED');
    }

    const newClassroom = await Classroom.findById(newClassroomId);

    if (!newClassroom) {
      throw new ApiError(404, 'New classroom not found', 'STUDENT_CLASSROOM_NOT_FOUND');
    }

    if (newClassroom.schoolId.toString() !== student.schoolId.toString()) {
      throw new ApiError(400, 'Cannot transfer to a classroom in a different school', 'STUDENT_CLASSROOM_SCHOOL_MISMATCH');
    }

    // Check new classroom capacity
    const currentStudents = await Student.countDocuments({
      classroomId: newClassroomId,
      status: 'ENROLLED',
    });

    if (currentStudents >= newClassroom.capacity) {
      throw new ApiError(400, 'Target classroom is at full capacity', 'STUDENT_CLASSROOM_FULL');
    }

    student.classroomId = newClassroomId;
    await student.save();

    return student.populate('classroomId', 'name capacity');
  }

  /**
   * Get student statistics
   * @param {Object} schoolFilter - School filter from scope middleware
   * @returns {Object} Student statistics
   */
  async getStudentStats(schoolFilter = {}) {
    const [
      totalStudents,
      enrolledStudents,
      transferredStudents,
      graduatedStudents,
    ] = await Promise.all([
      Student.countDocuments(schoolFilter),
      Student.countDocuments({ ...schoolFilter, status: 'ENROLLED' }),
      Student.countDocuments({ ...schoolFilter, status: 'TRANSFERRED' }),
      Student.countDocuments({ ...schoolFilter, status: 'GRADUATED' }),
    ]);

    return {
      total: totalStudents,
      enrolled: enrolledStudents,
      transferred: transferredStudents,
      graduated: graduatedStudents,
    };
  }
}

module.exports = new StudentService();
