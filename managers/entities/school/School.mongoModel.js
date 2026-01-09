const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'School name is required'],
        unique: true,
        trim: true,
        minlength: [2, 'School name must be at least 2 characters'],
        maxlength: [200, 'School name cannot exceed 200 characters'],
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    contactEmail: {
        type: String,
        required: [true, 'Contact email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    status: {
        type: String,
        enum: {
            values: ['ACTIVE', 'INACTIVE'],
            message: 'Status must be either ACTIVE or INACTIVE',
        },
        default: 'ACTIVE',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required'],
    },
}, {
    timestamps: true,
});

// Indexes (name has unique:true which creates an index automatically)
schoolSchema.index({ status: 1 });
schoolSchema.index({ createdBy: 1 });

module.exports = mongoose.model('School', schoolSchema);
