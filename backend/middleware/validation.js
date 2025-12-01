const Joi = require('joi');

/**
 * Validation middleware for request data
 * Uses Joi for schema validation
 */

/**
 * User registration validation
 */
const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

/**
 * User login validation
 */
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    identifier: Joi.string().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

/**
 * Profile update validation
 */
const validateProfileUpdate = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(20).optional(),
    email: Joi.string().email().optional(),
    firstName: Joi.string().max(50).allow('', null).optional(),
    lastName: Joi.string().max(50).allow('', null).optional(),
    dateOfBirth: Joi.alternatives().try(
      Joi.date(),
      Joi.string().allow('', null)
    ).optional(),
    country: Joi.string().max(50).allow('', null).optional()
  }).unknown(true);

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

/**
 * Settings update validation
 */
const validateSettingsUpdate = (req, res, next) => {
  const schema = Joi.object({
    notifications: Joi.boolean(),
    soundEnabled: Joi.boolean(),
    theme: Joi.string().valid('light', 'dark')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

/**
 * Password change validation
 */
const validatePasswordChange = (req, res, next) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

/**
 * Search query validation
 */
const validateSearch = (req, res, next) => {
  const schema = Joi.object({
    q: Joi.string().min(2).max(50).required(),
    limit: Joi.number().integer().min(1).max(50).default(10)
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateSettingsUpdate,
  validatePasswordChange,
  validateSearch
};