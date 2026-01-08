const Joi = require('joi');

/**
 * Address sub-schema
 */
const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).allow(''),
  city: Joi.string().trim().max(100).allow(''),
  state: Joi.string().trim().max(100).allow(''),
  zipCode: Joi.string().trim().max(20).allow(''),
  country: Joi.string().trim().max(100).allow(''),
});

/**
 * Create school validation schema
 */
const createSchoolSchema = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'School name must be at least 2 characters',
      'string.max': 'School name cannot exceed 200 characters',
      'any.required': 'School name is required',
    }),
  address: addressSchema,
  contactEmail: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid contact email',
      'any.required': 'Contact email is required',
    }),
  contactPhone: Joi.string()
    .trim()
    .max(20)
    .allow('')
    .messages({
      'string.max': 'Phone number cannot exceed 20 characters',
    }),
  status: Joi.string()
    .valid('ACTIVE', 'INACTIVE')
    .default('ACTIVE')
    .messages({
      'any.only': 'Status must be either ACTIVE or INACTIVE',
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),
  website: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Website URL cannot exceed 200 characters',
    }),
});

/**
 * Update school validation schema
 */
const updateSchoolSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'School name must be at least 2 characters',
      'string.max': 'School name cannot exceed 200 characters',
    }),
  address: addressSchema,
  contactEmail: Joi.string()
    .email()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid contact email',
    }),
  contactPhone: Joi.string()
    .trim()
    .max(20)
    .allow('')
    .messages({
      'string.max': 'Phone number cannot exceed 20 characters',
    }),
  status: Joi.string()
    .valid('ACTIVE', 'INACTIVE')
    .messages({
      'any.only': 'Status must be either ACTIVE or INACTIVE',
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),
  website: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Website URL cannot exceed 200 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field is required for update',
});

/**
 * Create school admin validation schema
 */
const createSchoolAdminSchema = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase, one uppercase, and one number',
      'any.required': 'Password is required',
    }),
});

/**
 * Query params validation schema
 */
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('ACTIVE', 'INACTIVE'),
  search: Joi.string().trim().max(100),
  sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const validateCreateSchool = (data) => createSchoolSchema.validate(data, { abortEarly: false });
const validateUpdateSchool = (data) => updateSchoolSchema.validate(data, { abortEarly: false });
const validateCreateSchoolAdmin = (data) => createSchoolAdminSchema.validate(data, { abortEarly: false });
const validateQuery = (data) => querySchema.validate(data, { abortEarly: false });

module.exports = {
  createSchoolSchema,
  updateSchoolSchema,
  createSchoolAdminSchema,
  querySchema,
  validateCreateSchool,
  validateUpdateSchool,
  validateCreateSchoolAdmin,
  validateQuery,
};
