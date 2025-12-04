const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * File upload middleware configuration
 * Handles avatar and other file uploads
 */

const createUploadDirs = () => {
  const uploadPath = process.env.UPLOAD_PATH || './uploads';
  const avatarsPath = path.join(uploadPath, 'avatars');
  
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  
  if (!fs.existsSync(avatarsPath)) {
    fs.mkdirSync(avatarsPath, { recursive: true });
  }
};

createUploadDirs();

/**
 * Storage configuration for avatar uploads
 */
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const avatarsPath = path.join(process.env.UPLOAD_PATH || './uploads', 'avatars');
    cb(null, avatarsPath);
  },
  filename: (req, file, cb) => {
    // userId is set by requireAuth middleware in req.session.userId
    const userId = req.session?.userId || 'unknown';
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `avatar_${userId}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

/**
 * File filter for images only
 */
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

/**
 * Avatar upload middleware
 */
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5000000
  },
  fileFilter: imageFileFilter
}).single('avatar');

/**
 * Error handling wrapper for multer
 */
const handleAvatarUpload = (req, res, next) => {
  uploadAvatar(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Invalid file field name. Use "avatar".' });
      }
      return res.status(400).json({ error: error.message });
    } else if (error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });
};

/**
 * Validation middleware for user authentication
 */
const validateUserAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required for file upload' });
  }
  next();
};

module.exports = {
  handleAvatarUpload,
  validateUserAuth,
  uploadAvatar
};