const mongoose = require('mongoose');

const SCHOOL_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'School name is required'],
      trim: true,
      minlength: [2, 'School name must be at least 2 characters'],
      maxlength: [200, 'School name cannot exceed 200 characters'],
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
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SCHOOL_STATUS),
        message: 'Status must be either ACTIVE or INACTIVE',
      },
      default: SCHOOL_STATUS.ACTIVE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'CreatedBy is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'Website URL cannot exceed 200 characters'],
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

// Indexes
schoolSchema.index({ name: 1 }, { unique: true });
schoolSchema.index({ status: 1 });
schoolSchema.index({ createdBy: 1 });
schoolSchema.index({ createdAt: -1 });

// Virtual for full address
schoolSchema.virtual('fullAddress').get(function () {
  const parts = [];
  if (this.address?.street) parts.push(this.address.street);
  if (this.address?.city) parts.push(this.address.city);
  if (this.address?.state) parts.push(this.address.state);
  if (this.address?.zipCode) parts.push(this.address.zipCode);
  if (this.address?.country) parts.push(this.address.country);
  return parts.join(', ');
});

const School = mongoose.model('School', schoolSchema);

module.exports = { School, SCHOOL_STATUS };
