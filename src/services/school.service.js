const { School, User, ROLES, Classroom, Student } = require('../models');
const { ApiError } = require('../middleware/errorHandler.middleware');

class SchoolService {
  /**
   * Create a new school
   * @param {Object} data - School data
   * @param {string} createdBy - User ID of the creator
   * @returns {Object} Created school
   */
  async createSchool(data, createdBy) {
    // Check if school with same name exists
    const existingSchool = await School.findOne({ name: data.name });

    if (existingSchool) {
      throw new ApiError(409, 'School with this name already exists', 'SCHOOL_DUPLICATE_NAME');
    }

    const school = await School.create({
      ...data,
      createdBy,
    });

    return school;
  }

  /**
   * Get all schools with pagination
   * @param {Object} query - Query parameters
   * @returns {Object} Schools list with pagination info
   */
  async getAllSchools(query) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [schools, total] = await Promise.all([
      School.find(filter)
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      School.countDocuments(filter),
    ]);

    return {
      schools,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get school by ID
   * @param {string} schoolId - School ID
   * @returns {Object} School data
   */
  async getSchoolById(schoolId) {
    const school = await School.findById(schoolId).populate('createdBy', 'name email');

    if (!school) {
      throw new ApiError(404, 'School not found', 'SCHOOL_NOT_FOUND');
    }

    // Get counts
    const [classroomCount, studentCount, adminCount] = await Promise.all([
      Classroom.countDocuments({ schoolId }),
      Student.countDocuments({ schoolId }),
      User.countDocuments({ schoolId, role: ROLES.SCHOOL_ADMIN }),
    ]);

    return {
      ...school.toJSON(),
      stats: {
        classrooms: classroomCount,
        students: studentCount,
        admins: adminCount,
      },
    };
  }

  /**
   * Update school
   * @param {string} schoolId - School ID
   * @param {Object} data - Update data
   * @returns {Object} Updated school
   */
  async updateSchool(schoolId, data) {
    const school = await School.findById(schoolId);

    if (!school) {
      throw new ApiError(404, 'School not found', 'SCHOOL_NOT_FOUND');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== school.name) {
      const existingSchool = await School.findOne({ name: data.name });
      if (existingSchool) {
        throw new ApiError(409, 'School with this name already exists', 'SCHOOL_DUPLICATE_NAME');
      }
    }

    Object.assign(school, data);
    await school.save();

    return school;
  }

  /**
   * Delete school
   * @param {string} schoolId - School ID
   */
  async deleteSchool(schoolId) {
    const school = await School.findById(schoolId);

    if (!school) {
      throw new ApiError(404, 'School not found', 'SCHOOL_NOT_FOUND');
    }

    // Check for associated resources
    const [classroomCount, studentCount, adminCount] = await Promise.all([
      Classroom.countDocuments({ schoolId }),
      Student.countDocuments({ schoolId }),
      User.countDocuments({ schoolId, role: ROLES.SCHOOL_ADMIN }),
    ]);

    if (classroomCount > 0 || studentCount > 0 || adminCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete school. It has ${classroomCount} classrooms, ${studentCount} students, and ${adminCount} admins associated.`,
        'SCHOOL_HAS_DEPENDENCIES'
      );
    }

    await School.findByIdAndDelete(schoolId);

    return { message: 'School deleted successfully' };
  }

  /**
   * Create school admin for a specific school
   * @param {string} schoolId - School ID
   * @param {Object} data - Admin user data
   * @returns {Object} Created admin user
   */
  async createSchoolAdmin(schoolId, data) {
    const school = await School.findById(schoolId);

    if (!school) {
      throw new ApiError(404, 'School not found', 'SCHOOL_NOT_FOUND');
    }

    // Check if email is already in use
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });

    if (existingUser) {
      throw new ApiError(409, 'Email already in use', 'USER_EMAIL_IN_USE');
    }

    // Create school admin
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: ROLES.SCHOOL_ADMIN,
      schoolId: schoolId,
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get all admins for a specific school
   * @param {string} schoolId - School ID
   * @returns {Array} List of school admins
   */
  async getSchoolAdmins(schoolId) {
    const school = await School.findById(schoolId);

    if (!school) {
      throw new ApiError(404, 'School not found', 'SCHOOL_NOT_FOUND');
    }

    const admins = await User.find({
      schoolId,
      role: ROLES.SCHOOL_ADMIN,
    }).select('-password');

    return admins;
  }
}

module.exports = new SchoolService();
