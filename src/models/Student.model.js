const mongoose = require('mongoose');

const STUDENT_STATUS = {
  ENROLLED: 'ENROLLED',
  TRANSFERRED: 'TRANSFERRED',
  GRADUATED: 'GRADUATED',
};

const studentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School ID is required'],
      index: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [1, 'First name must be at least 1 character'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [1, 'Last name must be at least 1 character'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function (value) {
          // Must be in the past
          return value < new Date();
        },
        message: 'Date of birth must be in the past',
      },
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, 'Street address cannot exceed 200 characters'],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, 'City cannot exceed 100 characters'],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [100, 'State cannot exceed 100 characters'],
      },
      zipCode: {
        type: String,
        trim: true,
        maxlength: [20, 'Zip code cannot exceed 20 characters'],
      },
      country: {
        type: String,
        trim: true,
        maxlength: [100, 'Country cannot exceed 100 characters'],
      },
    },
    guardianInfo: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Guardian name cannot exceed 100 characters'],
      },
      relationship: {
        type: String,
        trim: true,
        maxlength: [50, 'Relationship cannot exceed 50 characters'],
      },
      phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Guardian phone cannot exceed 20 characters'],
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid guardian email'],
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(STUDENT_STATUS),
        message: 'Status must be ENROLLED, TRANSFERRED, or GRADUATED',
      },
      default: STUDENT_STATUS.ENROLLED,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    graduationDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
studentSchema.index({ schoolId: 1, status: 1 });
studentSchema.index({ classroomId: 1 });
studentSchema.index({ lastName: 1, firstName: 1 });
studentSchema.index({ enrollmentDate: -1 });
studentSchema.index({ createdAt: -1 });

// Virtual for full name
studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
studentSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

const Student = mongoose.model('Student', studentSchema);

module.exports = { Student, STUDENT_STATUS };
