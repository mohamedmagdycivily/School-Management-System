const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
};

const userSchema = new mongoose.Schema(
  {
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
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
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
        values: Object.values(ROLES),
        message: 'Role must be either SUPERADMIN or SCHOOL_ADMIN',
      },
      required: [true, 'Role is required'],
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      default: null,
      validate: {
        validator: function (value) {
          // Superadmin should NOT have a schoolId
          if (this.role === ROLES.SUPERADMIN && value !== null) {
            return false;
          }
          // School Admin MUST have a schoolId
          if (this.role === ROLES.SCHOOL_ADMIN && !value) {
            return false;
          }
          return true;
        },
        message: 'SUPERADMIN must not have schoolId, SCHOOL_ADMIN must have schoolId',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ schoolId: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if user is superadmin
userSchema.methods.isSuperAdmin = function () {
  return this.role === ROLES.SUPERADMIN;
};

// Instance method to check if user is school admin
userSchema.methods.isSchoolAdmin = function () {
  return this.role === ROLES.SCHOOL_ADMIN;
};

// Static method to find by email with password
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password');
};

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES };
