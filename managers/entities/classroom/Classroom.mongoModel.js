const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School ID is required'],
        // index created via compound index below
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
    },
}, {
    timestamps: true,
});

// Compound index for unique classroom names within a school
classroomSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', classroomSchema);
