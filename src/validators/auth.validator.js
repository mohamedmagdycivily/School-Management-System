const Joi = require('joi');

/**
 * Login validation schema
 */
const loginSchema = Joi.object({
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
    .min(1)
    .messages({
      'any.required': 'Password is required',
    }),
});

/**
 * Setup (initial superadmin creation) validation schema
 */
const setupSchema = Joi.object({
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
  setupSecret: Joi.string()
    .required()
    .messages({
      'any.required': 'Setup secret is required',
    }),
});

/**
 * Validate login input
 */
const validateLogin = (data) => {
  return loginSchema.validate(data, { abortEarly: false });
};

/**
 * Validate setup input
 */
const validateSetup = (data) => {
  return setupSchema.validate(data, { abortEarly: false });
};

module.exports = {
  loginSchema,
  setupSchema,
  validateLogin,
  validateSetup,
};
