const User = require('./User.mongoModel');

module.exports = class UserManager { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.tokenManager        = managers.token;
        this.usersCollection     = "users";
        
        // HTTP exposed methods - available via /api/user/{methodName}
        this.httpExposed         = [
            'login',           // POST /api/user/login
            'setup',           // POST /api/user/setup (initial superadmin)
            'get=profile',     // GET /api/user/profile
            'createSchoolAdmin', // POST /api/user/createSchoolAdmin
        ];
    }

    /**
     * User login - returns JWT token
     */
    async login({ email, password }) {
        // Validation
        if (!email || !password) {
            return { error: 'Email and password are required' };
        }

        try {
            // Find user with password
            const user = await User.findOne({ email }).select('+password');
            
            if (!user) {
                return { error: 'Invalid email or password' };
            }

            // Compare password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return { error: 'Invalid email or password' };
            }

            // Generate token with role and schoolId
            const token = this.tokenManager.genLongToken({
                userId: user._id.toString(),
                userKey: user.email,
                role: user.role,
                schoolId: user.schoolId ? user.schoolId.toString() : null,
            });

            return {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    schoolId: user.schoolId,
                },
                token
            };
        } catch (err) {
            console.error('Login error:', err);
            return { error: 'Login failed' };
        }
    }

    /**
     * Initial superadmin setup - protected by setup secret
     */
    async setup({ name, email, password, setupSecret }) {
        // Verify setup secret
        if (setupSecret !== this.config.dotEnv.SETUP_SECRET) {
            return { error: 'Invalid setup secret' };
        }

        // Validation
        if (!name || !email || !password) {
            return { error: 'Name, email, and password are required' };
        }

        if (password.length < 8) {
            return { error: 'Password must be at least 8 characters' };
        }

        try {
            // Check if superadmin already exists
            const existingSuperadmin = await User.findOne({ role: 'SUPERADMIN' });
            if (existingSuperadmin) {
                return { error: 'Superadmin already exists' };
            }

            // Check if email is already taken
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return { error: 'Email already in use' };
            }

            // Create superadmin
            const superadmin = await User.create({
                name,
                email,
                password,
                role: 'SUPERADMIN',
                schoolId: null,
            });

            // Generate token
            const token = this.tokenManager.genLongToken({
                userId: superadmin._id.toString(),
                userKey: superadmin.email,
                role: superadmin.role,
                schoolId: null,
            });

            return {
                user: {
                    id: superadmin._id,
                    name: superadmin.name,
                    email: superadmin.email,
                    role: superadmin.role,
                },
                token
            };
        } catch (err) {
            console.error('Setup error:', err);
            if (err.code === 11000) {
                return { error: 'Email already in use' };
            }
            return { error: 'Setup failed: ' + err.message };
        }
    }

    /**
     * Get current user profile
     * Requires: __auth middleware
     */
    async profile({ __auth }) {
        if (!__auth || !__auth.userId) {
            return { error: 'Authentication required' };
        }

        try {
            const user = await User.findById(__auth.userId);
            if (!user) {
                return { error: 'User not found' };
            }

            return {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId,
                createdAt: user.createdAt,
            };
        } catch (err) {
            console.error('Profile error:', err);
            return { error: 'Failed to fetch profile' };
        }
    }

    /**
     * Create a school admin for a specific school
     * Requires: __auth, __superadmin middlewares
     */
    async createSchoolAdmin({ __auth, __superadmin, name, email, password, schoolId }) {
        if (!__auth || !__superadmin) {
            return { error: 'Superadmin authentication required' };
        }

        // Validation
        if (!name || !email || !password || !schoolId) {
            return { error: 'Name, email, password, and schoolId are required' };
        }

        if (password.length < 8) {
            return { error: 'Password must be at least 8 characters' };
        }

        try {
            // Verify school exists
            const School = require('../school/School.mongoModel');
            const school = await School.findById(schoolId);
            if (!school) {
                return { error: 'School not found' };
            }

            // Check if email is already taken
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return { error: 'Email already in use' };
            }

            // Create school admin
            const schoolAdmin = await User.create({
                name,
                email,
                password,
                role: 'SCHOOL_ADMIN',
                schoolId,
            });

            return {
                id: schoolAdmin._id,
                name: schoolAdmin.name,
                email: schoolAdmin.email,
                role: schoolAdmin.role,
                schoolId: schoolAdmin.schoolId,
                createdAt: schoolAdmin.createdAt,
            };
        } catch (err) {
            console.error('Create school admin error:', err);
            if (err.code === 11000) {
                return { error: 'Email already in use' };
            }
            return { error: 'Failed to create school admin: ' + err.message };
        }
    }

}
