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
 * Guardian info sub-schema
 */
const guardianInfoSchema = Joi.object({
  name: Joi.string().trim().max(100).allow(''),
  relationship: Joi.string().trim().max(50).allow(''),
  phone: Joi.string().trim().max(20).allow(''),
  email: Joi.string().email().lowercase().trim().allow(''),
});

/**
 * Create student validation schema
 */
const createStudentSchema = Joi.object({
  schoolId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid schoolId format',
    }),
  classroomId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid classroomId format',
    }),
  firstName: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(50)
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required',
    }),
  lastName: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(50)
    .messages({
      'string.min': 'Last name must be at least 1 character',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required',
    }),
  dob: Joi.date()
    .required()
    .max('now')
    .messages({
      'date.max': 'Date of birth must be in the past',
      'any.required': 'Date of birth is required',
    }),
  gender: Joi.string()
    .valid('MALE', 'FEMALE', 'OTHER')
    .messages({
      'any.only': 'Gender must be MALE, FEMALE, or OTHER',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  phone: Joi.string()
    .trim()
    .max(20)
    .allow('')
    .messages({
      'string.max': 'Phone number cannot exceed 20 characters',
    }),
  address: addressSchema,
  guardianInfo: guardianInfoSchema,
  status: Joi.string()
    .valid('ENROLLED', 'TRANSFERRED', 'GRADUATED')
    .default('ENROLLED')
    .messages({
      'any.only': 'Status must be ENROLLED, TRANSFERRED, or GRADUATED',
    }),
  enrollmentDate: Joi.date().default(() => new Date()),
  notes: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 2000 characters',
    }),
});

/**
 * Update student validation schema
 */
const updateStudentSchema = Joi.object({
  classroomId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid classroomId format',
    }),
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 50 characters',
    }),
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .messages({
      'string.min': 'Last name must be at least 1 character',
      'string.max': 'Last name cannot exceed 50 characters',
    }),
  dob: Joi.date()
    .max('now')
    .messages({
      'date.max': 'Date of birth must be in the past',
    }),
  gender: Joi.string()
    .valid('MALE', 'FEMALE', 'OTHER')
    .messages({
      'any.only': 'Gender must be MALE, FEMALE, or OTHER',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  phone: Joi.string()
    .trim()
    .max(20)
    .allow('')
    .messages({
      'string.max': 'Phone number cannot exceed 20 characters',
    }),
  address: addressSchema,
  guardianInfo: guardianInfoSchema,
  status: Joi.string()
    .valid('ENROLLED', 'TRANSFERRED', 'GRADUATED')
    .messages({
      'any.only': 'Status must be ENROLLED, TRANSFERRED, or GRADUATED',
    }),
  graduationDate: Joi.date()
    .allow(null)
    .messages({
      'date.base': 'Invalid graduation date format',
    }),
  notes: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 2000 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field is required for update',
});

/**
 * Query params validation schema for students
 */
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  schoolId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  classroomId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  status: Joi.string().valid('ENROLLED', 'TRANSFERRED', 'GRADUATED'),
  search: Joi.string().trim().max(100),
  sortBy: Joi.string().valid('firstName', 'lastName', 'dob', 'enrollmentDate', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const validateCreateStudent = (data) => createStudentSchema.validate(data, { abortEarly: false });
const validateUpdateStudent = (data) => updateStudentSchema.validate(data, { abortEarly: false });
const validateQuery = (data) => querySchema.validate(data, { abortEarly: false });

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  querySchema,
  validateCreateStudent,
  validateUpdateStudent,
  validateQuery,
};
