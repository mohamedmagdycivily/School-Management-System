const config = require('../config');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error Handler
 * Handles 404 errors for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    404,
    `Route not found: ${req.method} ${req.originalUrl}`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Global Error Handler
 * Handles all errors and returns consistent error responses
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let errors = err.errors || null;

  // Handle Joi validation errors (check first as they also have name === 'ValidationError')
  if (err.isJoi || (err.details && Array.isArray(err.details))) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    errors = err.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
  }
  // Handle Mongoose validation errors
  else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }
  // Handle Mongoose cast errors (invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }
  // Handle Mongoose duplicate key errors
  else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
    errors = [{ field, message: `This ${field} is already in use` }];
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Log error in development
  if (config.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode,
      code,
      message,
      errors,
      stack: err.stack,
    });
  }

  // Send error response
  const response = {
    success: false,
    error: message,
    code,
  };

  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (config.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors and pass them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
