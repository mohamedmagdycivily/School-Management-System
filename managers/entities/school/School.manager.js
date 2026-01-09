const School = require('./School.mongoModel');

module.exports = class SchoolManager {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;

        // HTTP exposed methods - Superadmin only
        this.httpExposed = [
            'create',           // POST /api/school/create
            'get=list',         // GET /api/school/list
            'get=getById',      // GET /api/school/getById
            'update',           // POST /api/school/update
            'delete',           // POST /api/school/delete
        ];
    }

    /**
     * Create a new school
     * Requires: __auth, __superadmin middlewares
     */
    async create({ __auth, __superadmin, name, address, contactEmail }) {
        if (!__auth || !__superadmin) {
            return { error: 'Superadmin authentication required' };
        }

        // Validation
        if (!name || !address || !contactEmail) {
            return { error: 'Name, address, and contactEmail are required' };
        }

        try {
            const school = await School.create({
                name,
                address,
                contactEmail,
                status: 'ACTIVE',
                createdBy: __auth.userId,
            });

            return {
                id: school._id,
                name: school.name,
                address: school.address,
                contactEmail: school.contactEmail,
                status: school.status,
                createdBy: school.createdBy,
                createdAt: school.createdAt,
            };
        } catch (err) {
            console.error('Create school error:', err);
            if (err.code === 11000) {
                return { error: 'School name already exists' };
            }
            return { error: 'Failed to create school: ' + err.message };
        }
    }

    /**
     * List all schools
     * Requires: __auth, __superadmin middlewares
     */
    async list({ __auth, __superadmin, status, page = 1, limit = 10 }) {
        if (!__auth || !__superadmin) {
            return { error: 'Superadmin authentication required' };
        }

        try {
            const query = {};
            if (status) {
                query.status = status;
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const schools = await School.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await School.countDocuments(query);

            return {
                schools: schools.map(s => ({
                    id: s._id,
                    name: s.name,
                    address: s.address,
                    contactEmail: s.contactEmail,
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
            console.error('List schools error:', err);
            return { error: 'Failed to fetch schools' };
        }
    }

    /**
     * Get school by ID
     * Requires: __auth, __superadmin middlewares
     */
    async getById({ __auth, __superadmin, schoolId }) {
        if (!__auth || !__superadmin) {
            return { error: 'Superadmin authentication required' };
        }

        if (!schoolId) {
            return { error: 'School ID is required' };
        }

        try {
            const school = await School.findById(schoolId);
            if (!school) {
                return { error: 'School not found' };
            }

            return {
                id: school._id,
                name: school.name,
                address: school.address,
                contactEmail: school.contactEmail,
                status: school.status,
                createdBy: school.createdBy,
                createdAt: school.createdAt,
                updatedAt: school.updatedAt,
            };
        } catch (err) {
            console.error('Get school error:', err);
            return { error: 'Failed to fetch school' };
        }
    }

    /**
     * Update a school
     * Requires: __auth, __superadmin middlewares
     */
    async update({ __auth, __superadmin, schoolId, name, address, contactEmail, status }) {
        if (!__auth || !__superadmin) {
            return { error: 'Superadmin authentication required' };
        }

        if (!schoolId) {
            return { error: 'School ID is required' };
        }

        try {
            const updateData = {};
            if (name) updateData.name = name;
            if (address) updateData.address = address;
            if (contactEmail) updateData.contactEmail = contactEmail;
            if (status) updateData.status = status;

            const school = await School.findByIdAndUpdate(
                schoolId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!school) {
                return { error: 'School not found' };
            }

            return {
                id: school._id,
                name: school.name,
                address: school.address,
                contactEmail: school.contactEmail,
                status: school.status,
                updatedAt: school.updatedAt,
            };
        } catch (err) {
            console.error('Update school error:', err);
            if (err.code === 11000) {
                return { error: 'School name already exists' };
            }
            return { error: 'Failed to update school: ' + err.message };
        }
    }

    /**
     * Delete a school
     * Requires: __auth, __superadmin middlewares
     */
    async delete({ __auth, __superadmin, schoolId }) {
        if (!__auth || !__superadmin) {
            return { error: 'Superadmin authentication required' };
        }

        if (!schoolId) {
            return { error: 'School ID is required' };
        }

        try {
            const school = await School.findByIdAndDelete(schoolId);
            if (!school) {
                return { error: 'School not found' };
            }

            // Optionally: cascade delete related entities
            const Classroom = require('../classroom/Classroom.mongoModel');
            const Student = require('../student/Student.mongoModel');
            const User = require('../user/User.mongoModel');

            await Classroom.deleteMany({ schoolId });
            await Student.deleteMany({ schoolId });
            await User.deleteMany({ schoolId });

            return {
                message: 'School and all related data deleted successfully',
                deletedSchoolId: schoolId,
            };
        } catch (err) {
            console.error('Delete school error:', err);
            return { error: 'Failed to delete school' };
        }
    }

};
