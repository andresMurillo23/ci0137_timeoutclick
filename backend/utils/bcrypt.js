const bcrypt = require('bcrypt');

/**
 * Bcrypt utility functions for password hashing
 * Salt rounds optimized for both local and cloud environments
 */
const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare plain text password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Generate random token for email verification or password reset
 * @param {number} length - Token length (default: 32)
 * @returns {string} Random hex token
 */
const generateToken = (length = 32) => {
  return require('crypto').randomBytes(length).toString('hex');
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken
};