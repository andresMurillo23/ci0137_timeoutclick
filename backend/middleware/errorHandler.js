/**
 * Error handling middleware
 * Centralized error handling for the application
 */

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  return {
    message: 'Validation Error',
    errors: errors
  };
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  return {
    message: `${field} already exists`,
    field: field
  };
};

/**
 * Handle Mongoose cast errors
 */
const handleCastError = (error) => {
  return {
    message: `Invalid ${error.path}: ${error.value}`,
    field: error.path
  };
};

/**
 * Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  let customError = {
    statusCode: error.statusCode || 500,
    message: error.message || 'Internal Server Error'
  };

  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    const validationError = handleValidationError(error);
    customError.statusCode = 400;
    customError.message = validationError.message;
    customError.errors = validationError.errors;
  }

  if (error.code && error.code === 11000) {
    const duplicateError = handleDuplicateKeyError(error);
    customError.statusCode = 400;
    customError.message = duplicateError.message;
    customError.field = duplicateError.field;
  }

  if (error.name === 'CastError') {
    const castError = handleCastError(error);
    customError.statusCode = 400;
    customError.message = castError.message;
    customError.field = castError.field;
  }

  if (error.name === 'JsonWebTokenError') {
    customError.statusCode = 401;
    customError.message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    customError.statusCode = 401;
    customError.message = 'Token expired';
  }

  res.status(customError.statusCode).json({
    error: customError.message,
    ...(customError.errors && { errors: customError.errors }),
    ...(customError.field && { field: customError.field }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * Handle 404 errors - route not found
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFound
};