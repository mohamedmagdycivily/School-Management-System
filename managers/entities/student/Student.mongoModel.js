const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School ID is required'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [1, 'First name must be at least 1 character'],
      maxlength: [100, 'First name cannot exceed 100 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [1, 'Last name must be at least 1 character'],
      maxlength: [100, 'Last name cannot exceed 100 characters'],
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // Allow null/undefined but unique when present
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['ENROLLED', 'TRANSFERRED', 'GRADUATED'],
        message: 'Status must be ENROLLED, TRANSFERRED, or GRADUATED',
      },
      default: 'ENROLLED',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
studentSchema.index({ schoolId: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ classroomId: 1 });
studentSchema.index({ lastName: 1, firstName: 1 });

module.exports = mongoose.model('Student', studentSchema);
