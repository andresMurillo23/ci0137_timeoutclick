const User = require('../models/User');
const Friendship = require('../models/Friendship');
const { hashPassword, comparePassword, generateToken } = require('../utils/bcrypt');

/**
 * Authentication controller
 * Handles user registration, login, logout, and password recovery
 */

/**
 * Register new user
 * @route POST /api/auth/register
 * @param {string} username - Unique username (3-20 characters)
 * @param {string} email - Valid email address
 * @param {string} password - Password (minimum 6 characters)
 * @param {string} confirmPassword - Password confirmation
 * @returns {object} User data and authentication token
 */
const register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email.toLowerCase() ? 'Email already exists' : 'Username already exists'
      });
    }

    const hashedPassword = await hashPassword(password);
    const emailVerificationToken = generateToken();

    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerificationToken,
      isEmailVerified: false
    });

    await user.save();

    // Generate simple session token
    const sessionToken = Buffer.from(user._id.toString()).toString('base64');

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      token: sessionToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @param {string} identifier - Username or email
 * @param {string} password - User password
 * @returns {object} User data and authentication token
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() }
      ],
      status: 'active'
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastActive = new Date();
    await user.save();

    // Generate session token
    const sessionToken = Buffer.from(user._id.toString()).toString('base64');

    res.json({
      success: true,
      message: 'Login successful',
      token: sessionToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        gameStats: user.gameStats,
        winRate: user.winRate
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Logout user
 */
const logout = (req, res) => {
  // With token-based auth, logout is handled client-side by removing token from sessionStorage
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

/**
 * Get current authenticated user information
 * @route GET /api/auth/me
 * @requires Authentication token
 * @returns {object} Current user data
 */
const getCurrentUser = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.userId);
    if (!user || user.status !== 'active') {
      req.session.destroy();
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        emailVerified: user.isEmailVerified,
        isEmailVerified: user.isEmailVerified,
        gameStats: user.gameStats,
        winRate: user.winRate,
        settings: user.settings,
        profile: user.profile,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        friendsCount: await (async () => {
          try {
            const friends = await Friendship.getFriends(user._id);
            return Array.isArray(friends) ? friends.length : 0;
          } catch (e) {
            console.warn('Failed to compute friendsCount:', e && e.message);
            return 0;
          }
        })()
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
};

/**
 * Request password reset
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      status: 'active'
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = generateToken();
    const resetExpires = new Date(Date.now() + 3600000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email',
      resetToken: resetToken
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
      status: 'active'
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await hashPassword(newPassword);
    
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * Verify email with token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      status: 'active'
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verifyEmail
};