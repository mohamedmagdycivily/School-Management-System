const Student = require('./Student.mongoModel');
const School = require('../school/School.mongoModel');

module.exports = class StudentManager {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;

        // HTTP exposed methods - RBAC enforced
        this.httpExposed = [
            'enroll',           // POST /api/student/enroll
            'get=list',         // GET /api/student/list
            'get=getById',      // GET /api/student/getById
            'update',           // POST /api/student/update
            'delete',           // POST /api/student/delete
            'transfer',         // POST /api/student/transfer
        ];
    }

    /**
     * Enroll a new student
     * Requires: __auth, __schoolAdmin, __schoolScope middlewares
     * - SUPERADMIN: must provide schoolId in body
     * - SCHOOL_ADMIN: uses their assigned schoolId
     */
    async enroll({ __auth, __schoolAdmin, __schoolScope, firstName, lastName, dob, email, classroomId, schoolId }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        // Validation
        if (!firstName || !lastName || !dob) {
            return { error: 'First name, last name, and date of birth are required' };
        }

        // Determine the school ID based on role
        let targetSchoolId;
        if (__schoolScope && __schoolScope.isSuperadmin) {
            // Superadmin must provide schoolId
            targetSchoolId = schoolId;
            if (!targetSchoolId) {
                return { error: 'Superadmin must provide schoolId' };
            }
        } else if (__schoolScope && __schoolScope.schoolId) {
            // School Admin uses their assigned school
            targetSchoolId = __schoolScope.schoolId;
        } else {
            return { error: 'Unable to determine school scope' };
        }

        try {
            // Verify school exists
            const school = await School.findById(targetSchoolId);
            if (!school) {
                return { error: 'School not found' };
            }

            // Verify classroom exists and belongs to the same school (if provided)
            if (classroomId) {
                const Classroom = require('../classroom/Classroom.mongoModel');
                const classroom = await Classroom.findById(classroomId);
                if (!classroom) {
                    return { error: 'Classroom not found' };
                }
                if (classroom.schoolId.toString() !== targetSchoolId.toString()) {
                    return { error: 'Classroom does not belong to the specified school' };
                }
            }

            const student = await Student.create({
                schoolId: targetSchoolId,
                firstName,
                lastName,
                dob: new Date(dob),
                email: email || null,
                classroomId: classroomId || null,
                status: 'ENROLLED',
            });

            return {
                id: student._id,
                schoolId: student.schoolId,
                firstName: student.firstName,
                lastName: student.lastName,
                dob: student.dob,
                email: student.email,
                classroomId: student.classroomId,
                status: student.status,
                createdAt: student.createdAt,
            };
        } catch (err) {
            console.error('Enroll student error:', err);
            return { error: 'Failed to enroll student: ' + err.message };
        }
    }

    /**
     * List students (scoped by role)
     * - SUPERADMIN: can list all or filter by schoolId
     * - SCHOOL_ADMIN: only sees their school's students
     */
    async list({ __auth, __schoolAdmin, __schoolScope, schoolId, classroomId, status, page = 1, limit = 10 }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        try {
            const query = {};

            if (__schoolScope && __schoolScope.isSuperadmin) {
                // Superadmin can filter by schoolId or see all
                if (schoolId) {
                    query.schoolId = schoolId;
                }
            } else if (__schoolScope && __schoolScope.schoolId) {
                // School Admin only sees their school's data
                query.schoolId = __schoolScope.schoolId;
            } else {
                return { error: 'Unable to determine school scope' };
            }

            // Additional filters
            if (classroomId) {
                query.classroomId = classroomId;
            }
            if (status) {
                query.status = status;
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const students = await Student.find(query)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name')
                .sort({ lastName: 1, firstName: 1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Student.countDocuments(query);

            return {
                students: students.map(s => ({
                    id: s._id,
                    schoolId: s.schoolId?._id || s.schoolId,
                    schoolName: s.schoolId?.name || null,
                    classroomId: s.classroomId?._id || s.classroomId,
                    classroomName: s.classroomId?.name || null,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    dob: s.dob,
                    email: s.email,
                    status: s.status,
                    createdAt: s.createdAt,
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit)),
                }
            };
        } catch (err) {
            console.error('List students error:', err);
            return { error: 'Failed to fetch students' };
        }
    }

    /**
     * Get student by ID (scoped by role)
     */
    async getById({ __auth, __schoolAdmin, __schoolScope, studentId }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        if (!studentId) {
            return { error: 'Student ID is required' };
        }

        try {
            const student = await Student.findById(studentId)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name');

            if (!student) {
                return { error: 'Student not found' };
            }

            // Verify school scope for non-superadmin
            const studentSchoolId = student.schoolId?._id || student.schoolId;
            if (!__schoolScope.isSuperadmin && 
                studentSchoolId.toString() !== __schoolScope.schoolId.toString()) {
                return { error: 'Access denied. Student belongs to a different school.' };
            }

            return {
                id: student._id,
                schoolId: studentSchoolId,
                schoolName: student.schoolId?.name || null,
                classroomId: student.classroomId?._id || student.classroomId,
                classroomName: student.classroomId?.name || null,
                firstName: student.firstName,
                lastName: student.lastName,
                dob: student.dob,
                email: student.email,
                status: student.status,
                createdAt: student.createdAt,
                updatedAt: student.updatedAt,
            };
        } catch (err) {
            console.error('Get student error:', err);
            return { error: 'Failed to fetch student' };
        }
    }

    /**
     * Update a student (scoped by role)
     */
    async update({ __auth, __schoolAdmin, __schoolScope, studentId, firstName, lastName, dob, email, classroomId, status }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        if (!studentId) {
            return { error: 'Student ID is required' };
        }

        try {
            // First, fetch to verify scope
            const existingStudent = await Student.findById(studentId);
            if (!existingStudent) {
                return { error: 'Student not found' };
            }

            // Verify school scope for non-superadmin
            if (!__schoolScope.isSuperadmin && 
                existingStudent.schoolId.toString() !== __schoolScope.schoolId.toString()) {
                return { error: 'Access denied. Student belongs to a different school.' };
            }

            // Verify classroom belongs to same school (if updating)
            if (classroomId) {
                const Classroom = require('../classroom/Classroom.mongoModel');
                const classroom = await Classroom.findById(classroomId);
                if (!classroom) {
                    return { error: 'Classroom not found' };
                }
                if (classroom.schoolId.toString() !== existingStudent.schoolId.toString()) {
                    return { error: 'Classroom does not belong to the student\'s school' };
                }
            }

            const updateData = {};
            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;
            if (dob) updateData.dob = new Date(dob);
            if (email !== undefined) updateData.email = email;
            if (classroomId !== undefined) updateData.classroomId = classroomId || null;
            if (status) updateData.status = status;

            const student = await Student.findByIdAndUpdate(
                studentId,
                updateData,
                { new: true, runValidators: true }
            );

            return {
                id: student._id,
                schoolId: student.schoolId,
                firstName: student.firstName,
                lastName: student.lastName,
                dob: student.dob,
                email: student.email,
                classroomId: student.classroomId,
                status: student.status,
                updatedAt: student.updatedAt,
            };
        } catch (err) {
            console.error('Update student error:', err);
            return { error: 'Failed to update student: ' + err.message };
        }
    }

    /**
     * Delete a student (scoped by role)
     */
    async delete({ __auth, __schoolAdmin, __schoolScope, studentId }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        if (!studentId) {
            return { error: 'Student ID is required' };
        }

        try {
            // First, fetch to verify scope
            const existingStudent = await Student.findById(studentId);
            if (!existingStudent) {
                return { error: 'Student not found' };
            }

            // Verify school scope for non-superadmin
            if (!__schoolScope.isSuperadmin && 
                existingStudent.schoolId.toString() !== __schoolScope.schoolId.toString()) {
                return { error: 'Access denied. Student belongs to a different school.' };
            }

            await Student.findByIdAndDelete(studentId);

            return {
                message: 'Student deleted successfully',
                deletedStudentId: studentId,
            };
        } catch (err) {
            console.error('Delete student error:', err);
            return { error: 'Failed to delete student' };
        }
    }

    /**
     * Transfer a student to another school
     * Only SUPERADMIN can transfer students between schools
     */
    async transfer({ __auth, __superadmin, studentId, targetSchoolId }) {
        if (!__auth || !__superadmin) {
            return { error: 'Superadmin authentication required' };
        }

        if (!studentId || !targetSchoolId) {
            return { error: 'Student ID and target school ID are required' };
        }

        try {
            const student = await Student.findById(studentId);
            if (!student) {
                return { error: 'Student not found' };
            }

            const targetSchool = await School.findById(targetSchoolId);
            if (!targetSchool) {
                return { error: 'Target school not found' };
            }

            const previousSchoolId = student.schoolId;

            student.schoolId = targetSchoolId;
            student.classroomId = null; // Remove from classroom when transferring
            student.status = 'TRANSFERRED';
            await student.save();

            return {
                id: student._id,
                firstName: student.firstName,
                lastName: student.lastName,
                previousSchoolId,
                newSchoolId: targetSchoolId,
                status: student.status,
                message: 'Student transferred successfully',
            };
        } catch (err) {
            console.error('Transfer student error:', err);
            return { error: 'Failed to transfer student: ' + err.message };
        }
    }

};
