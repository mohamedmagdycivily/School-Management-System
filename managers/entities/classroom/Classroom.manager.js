const Classroom = require('./Classroom.mongoModel');
const School = require('../school/School.mongoModel');

module.exports = class ClassroomManager {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;

        // HTTP exposed methods - RBAC enforced
        this.httpExposed = [
            'create',           // POST /api/classroom/create
            'get=list',         // GET /api/classroom/list
            'get=getById',      // GET /api/classroom/getById
            'update',           // POST /api/classroom/update
            'delete',           // POST /api/classroom/delete
        ];
    }

    /**
     * Create a new classroom
     * Requires: __auth, __schoolAdmin, __schoolScope middlewares
     * - SUPERADMIN: must provide schoolId in body
     * - SCHOOL_ADMIN: uses their assigned schoolId
     */
    async create({ __auth, __schoolAdmin, __schoolScope, name, capacity, resources, schoolId }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        // Validation
        if (!name || !capacity) {
            return { error: 'Name and capacity are required' };
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

            const classroom = await Classroom.create({
                schoolId: targetSchoolId,
                name,
                capacity: parseInt(capacity),
                resources: resources || [],
            });

            return {
                id: classroom._id,
                schoolId: classroom.schoolId,
                name: classroom.name,
                capacity: classroom.capacity,
                resources: classroom.resources,
                createdAt: classroom.createdAt,
            };
        } catch (err) {
            console.error('Create classroom error:', err);
            if (err.code === 11000) {
                return { error: 'Classroom name already exists in this school' };
            }
            return { error: 'Failed to create classroom: ' + err.message };
        }
    }

    /**
     * List classrooms (scoped by role)
     * - SUPERADMIN: can list all or filter by schoolId
     * - SCHOOL_ADMIN: only sees their school's classrooms
     */
    async list({ __auth, __schoolAdmin, __schoolScope, schoolId, page = 1, limit = 10 }) {
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

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const classrooms = await Classroom.find(query)
                .populate('schoolId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Classroom.countDocuments(query);

            return {
                classrooms: classrooms.map(c => ({
                    id: c._id,
                    schoolId: c.schoolId._id || c.schoolId,
                    schoolName: c.schoolId.name || null,
                    name: c.name,
                    capacity: c.capacity,
                    resources: c.resources,
                    createdAt: c.createdAt,
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit)),
                }
            };
        } catch (err) {
            console.error('List classrooms error:', err);
            return { error: 'Failed to fetch classrooms' };
        }
    }

    /**
     * Get classroom by ID (scoped by role)
     */
    async getById({ __auth, __schoolAdmin, __schoolScope, classroomId }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        if (!classroomId) {
            return { error: 'Classroom ID is required' };
        }

        try {
            const classroom = await Classroom.findById(classroomId).populate('schoolId', 'name');
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            // Verify school scope for non-superadmin
            if (!__schoolScope.isSuperadmin && 
                classroom.schoolId._id.toString() !== __schoolScope.schoolId.toString()) {
                return { error: 'Access denied. Classroom belongs to a different school.' };
            }

            return {
                id: classroom._id,
                schoolId: classroom.schoolId._id,
                schoolName: classroom.schoolId.name,
                name: classroom.name,
                capacity: classroom.capacity,
                resources: classroom.resources,
                createdAt: classroom.createdAt,
                updatedAt: classroom.updatedAt,
            };
        } catch (err) {
            console.error('Get classroom error:', err);
            return { error: 'Failed to fetch classroom' };
        }
    }

    /**
     * Update a classroom (scoped by role)
     */
    async update({ __auth, __schoolAdmin, __schoolScope, classroomId, name, capacity, resources }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        if (!classroomId) {
            return { error: 'Classroom ID is required' };
        }

        try {
            // First, fetch to verify scope
            const existingClassroom = await Classroom.findById(classroomId);
            if (!existingClassroom) {
                return { error: 'Classroom not found' };
            }

            // Verify school scope for non-superadmin
            if (!__schoolScope.isSuperadmin && 
                existingClassroom.schoolId.toString() !== __schoolScope.schoolId.toString()) {
                return { error: 'Access denied. Classroom belongs to a different school.' };
            }

            const updateData = {};
            if (name) updateData.name = name;
            if (capacity) updateData.capacity = parseInt(capacity);
            if (resources !== undefined) updateData.resources = resources;

            const classroom = await Classroom.findByIdAndUpdate(
                classroomId,
                updateData,
                { new: true, runValidators: true }
            );

            return {
                id: classroom._id,
                schoolId: classroom.schoolId,
                name: classroom.name,
                capacity: classroom.capacity,
                resources: classroom.resources,
                updatedAt: classroom.updatedAt,
            };
        } catch (err) {
            console.error('Update classroom error:', err);
            if (err.code === 11000) {
                return { error: 'Classroom name already exists in this school' };
            }
            return { error: 'Failed to update classroom: ' + err.message };
        }
    }

    /**
     * Delete a classroom (scoped by role)
     */
    async delete({ __auth, __schoolAdmin, __schoolScope, classroomId }) {
        if (!__auth || !__schoolAdmin) {
            return { error: 'Authentication required' };
        }

        if (!classroomId) {
            return { error: 'Classroom ID is required' };
        }

        try {
            // First, fetch to verify scope
            const existingClassroom = await Classroom.findById(classroomId);
            if (!existingClassroom) {
                return { error: 'Classroom not found' };
            }

            // Verify school scope for non-superadmin
            if (!__schoolScope.isSuperadmin && 
                existingClassroom.schoolId.toString() !== __schoolScope.schoolId.toString()) {
                return { error: 'Access denied. Classroom belongs to a different school.' };
            }

            await Classroom.findByIdAndDelete(classroomId);

            // Update students who were in this classroom
            const Student = require('../student/Student.mongoModel');
            await Student.updateMany(
                { classroomId },
                { $set: { classroomId: null } }
            );

            return {
                message: 'Classroom deleted successfully',
                deletedClassroomId: classroomId,
            };
        } catch (err) {
            console.error('Delete classroom error:', err);
            return { error: 'Failed to delete classroom' };
        }
    }

};
