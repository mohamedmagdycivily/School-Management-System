const { Classroom, School, Student } = require('../models');
const { ApiError } = require('../middleware/errorHandler.middleware');

class ClassroomService {
  /**
   * Create a new classroom
   * @param {Object} data - Classroom data
   * @returns {Object} Created classroom
   */
  async createClassroom(data) {
    // Verify school exists
    const school = await School.findById(data.schoolId);

    if (!school) {
      throw new ApiError(404, 'School not found', 'CLASSROOM_SCHOOL_NOT_FOUND');
    }

    // Check if classroom with same name exists in this school
    const existingClassroom = await Classroom.findOne({
      schoolId: data.schoolId,
      name: data.name,
    });

    if (existingClassroom) {
      throw new ApiError(409, 'Classroom with this name already exists in this school', 'CLASSROOM_DUPLICATE_NAME');
    }

    const classroom = await Classroom.create(data);

    return classroom;
  }

  /**
   * Get all classrooms with pagination and school filter
   * @param {Object} query - Query parameters
   * @param {Object} schoolFilter - School filter from scope middleware
   * @returns {Object} Classrooms list with pagination info
   */
  async getAllClassrooms(query, schoolFilter = {}) {
    const {
      page = 1,
      limit = 10,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = { ...schoolFilter };

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { building: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [classrooms, total] = await Promise.all([
      Classroom.find(filter)
        .populate('schoolId', 'name status')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Classroom.countDocuments(filter),
    ]);

    // Get student counts for each classroom
    const classroomsWithCounts = await Promise.all(
      classrooms.map(async (classroom) => {
        const studentCount = await Student.countDocuments({
          classroomId: classroom._id,
          status: 'ENROLLED',
        });
        return {
          ...classroom.toJSON(),
          currentStudents: studentCount,
          availableCapacity: classroom.capacity - studentCount,
        };
      })
    );

    return {
      classrooms: classroomsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get classroom by ID
   * @param {string} classroomId - Classroom ID
   * @param {Object} schoolFilter - School filter from scope middleware
   * @returns {Object} Classroom data
   */
  async getClassroomById(classroomId, schoolFilter = {}) {
    const filter = { _id: classroomId, ...schoolFilter };
    const classroom = await Classroom.findOne(filter).populate('schoolId', 'name status');

    if (!classroom) {
      throw new ApiError(404, 'Classroom not found', 'CLASSROOM_NOT_FOUND');
    }

    // Get student count
    const studentCount = await Student.countDocuments({
      classroomId: classroom._id,
      status: 'ENROLLED',
    });

    return {
      ...classroom.toJSON(),
      currentStudents: studentCount,
      availableCapacity: classroom.capacity - studentCount,
    };
  }

  /**
   * Update classroom
   * @param {string} classroomId - Classroom ID
   * @param {Object} data - Update data
   * @param {Object} resource - Pre-fetched resource from scope middleware
   * @returns {Object} Updated classroom
   */
  async updateClassroom(classroomId, data, resource = null) {
    const classroom = resource || await Classroom.findById(classroomId);

    if (!classroom) {
      throw new ApiError(404, 'Classroom not found', 'CLASSROOM_NOT_FOUND');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== classroom.name) {
      const existingClassroom = await Classroom.findOne({
        schoolId: classroom.schoolId,
        name: data.name,
        _id: { $ne: classroomId },
      });
      if (existingClassroom) {
        throw new ApiError(409, 'Classroom with this name already exists in this school', 'CLASSROOM_DUPLICATE_NAME');
      }
    }

    Object.assign(classroom, data);
    await classroom.save();

    return classroom;
  }

  /**
   * Delete classroom
   * @param {string} classroomId - Classroom ID
   * @param {Object} resource - Pre-fetched resource from scope middleware
   */
  async deleteClassroom(classroomId, resource = null) {
    const classroom = resource || await Classroom.findById(classroomId);

    if (!classroom) {
      throw new ApiError(404, 'Classroom not found', 'CLASSROOM_NOT_FOUND');
    }

    // Check for enrolled students
    const studentCount = await Student.countDocuments({
      classroomId,
      status: 'ENROLLED',
    });

    if (studentCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete classroom. It has ${studentCount} enrolled students.`,
        'CLASSROOM_HAS_STUDENTS'
      );
    }

    await Classroom.findByIdAndDelete(classroomId);

    return { message: 'Classroom deleted successfully' };
  }

  /**
   * Get students in a classroom
   * @param {string} classroomId - Classroom ID
   * @param {Object} schoolFilter - School filter from scope middleware
   * @returns {Array} List of students
   */
  async getClassroomStudents(classroomId, schoolFilter = {}) {
    const filter = { _id: classroomId, ...schoolFilter };
    const classroom = await Classroom.findOne(filter);

    if (!classroom) {
      throw new ApiError(404, 'Classroom not found', 'CLASSROOM_NOT_FOUND');
    }

    const students = await Student.find({
      classroomId,
      status: 'ENROLLED',
    }).sort({ lastName: 1, firstName: 1 });

    return students;
  }
}

module.exports = new ClassroomService();
