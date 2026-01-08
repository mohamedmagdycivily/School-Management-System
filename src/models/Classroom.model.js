const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Classroom name is required'],
      trim: true,
      minlength: [1, 'Classroom name must be at least 1 character'],
      maxlength: [100, 'Classroom name cannot exceed 100 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [500, 'Capacity cannot exceed 500'],
    },
    resources: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.every((item) => typeof item === 'string' && item.length <= 100);
        },
        message: 'Each resource must be a string with max 100 characters',
      },
    },
    floor: {
      type: Number,
      min: [0, 'Floor must be at least 0'],
      max: [100, 'Floor cannot exceed 100'],
    },
    building: {
      type: String,
      trim: true,
      maxlength: [100, 'Building name cannot exceed 100 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    schedule: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for unique classroom name within a school
classroomSchema.index({ schoolId: 1, name: 1 }, { unique: true });
classroomSchema.index({ capacity: 1 });
classroomSchema.index({ isActive: 1 });
classroomSchema.index({ createdAt: -1 });

// Virtual for current student count (to be populated from students collection)
classroomSchema.virtual('studentCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'classroomId',
  count: true,
});

const Classroom = mongoose.model('Classroom', classroomSchema);

module.exports = { Classroom };
