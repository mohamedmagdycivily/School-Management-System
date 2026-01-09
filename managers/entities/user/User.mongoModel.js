const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false, // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: {
            values: ['SUPERADMIN', 'SCHOOL_ADMIN'],
            message: 'Role must be either SUPERADMIN or SCHOOL_ADMIN',
        },
        required: [true, 'Role is required'],
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        default: null,
        // Required only for SCHOOL_ADMIN, validated in pre-save hook
    },
}, {
    timestamps: true,
});

// Indexes (email has unique:true which creates an index automatically)
userSchema.index({ role: 1 });
userSchema.index({ schoolId: 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
    // Validate schoolId based on role
    if (this.role === 'SCHOOL_ADMIN' && !this.schoolId) {
        const error = new Error('School Admin must have a schoolId');
        error.name = 'ValidationError';
        return next(error);
    }
    if (this.role === 'SUPERADMIN' && this.schoolId) {
        this.schoolId = null; // Superadmin should not have schoolId
    }

    // Only hash password if it's modified
    if (!this.isModified('password')) return next();
    
    try {
        const saltRounds = 10;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Transform to hide sensitive data
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model('User', userSchema);
