const Joi = require('joi');

/**
 * Create classroom validation schema
 */
const createClassroomSchema = Joi.object({
  schoolId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid schoolId format',
    }),
  name: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'Classroom name must be at least 1 character',
      'string.max': 'Classroom name cannot exceed 100 characters',
      'any.required': 'Classroom name is required',
    }),
  capacity: Joi.number()
    .required()
    .integer()
    .min(1)
    .max(500)
    .messages({
      'number.min': 'Capacity must be at least 1',
      'number.max': 'Capacity cannot exceed 500',
      'any.required': 'Capacity is required',
    }),
  resources: Joi.array()
    .items(Joi.string().trim().max(100))
    .default([])
    .messages({
      'array.base': 'Resources must be an array',
    }),
  floor: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .messages({
      'number.min': 'Floor must be at least 0',
      'number.max': 'Floor cannot exceed 100',
    }),
  building: Joi.string()
    .trim()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'Building name cannot exceed 100 characters',
    }),
  isActive: Joi.boolean().default(true),
});

/**
 * Update classroom validation schema
 */
const updateClassroomSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'Classroom name must be at least 1 character',
      'string.max': 'Classroom name cannot exceed 100 characters',
    }),
  capacity: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .messages({
      'number.min': 'Capacity must be at least 1',
      'number.max': 'Capacity cannot exceed 500',
    }),
  resources: Joi.array()
    .items(Joi.string().trim().max(100))
    .messages({
      'array.base': 'Resources must be an array',
    }),
  floor: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .messages({
      'number.min': 'Floor must be at least 0',
      'number.max': 'Floor cannot exceed 100',
    }),
  building: Joi.string()
    .trim()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'Building name cannot exceed 100 characters',
    }),
  isActive: Joi.boolean(),
}).min(1).messages({
  'object.min': 'At least one field is required for update',
});

/**
 * Query params validation schema for classrooms
 */
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  schoolId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  isActive: Joi.boolean(),
  search: Joi.string().trim().max(100),
  sortBy: Joi.string().valid('name', 'capacity', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const validateCreateClassroom = (data) => createClassroomSchema.validate(data, { abortEarly: false });
const validateUpdateClassroom = (data) => updateClassroomSchema.validate(data, { abortEarly: false });
const validateQuery = (data) => querySchema.validate(data, { abortEarly: false });

module.exports = {
  createClassroomSchema,
  updateClassroomSchema,
  querySchema,
  validateCreateClassroom,
  validateUpdateClassroom,
  validateQuery,
};
