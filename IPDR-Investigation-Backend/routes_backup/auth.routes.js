const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
], validationMiddleware, authController.login);

// POST /api/auth/register - Register new user (Admin only)
router.post('/register', authMiddleware, [
    body('badgeNumber')
        .matches(/^[A-Z0-9]{4,10}$/)
        .withMessage('Badge number must be 4-10 alphanumeric characters'),
    body('firstName')
        .isLength({ min: 2, max: 50 })
        .trim()
        .withMessage('First name must be 2-50 characters'),
    body('lastName')
        .isLength({ min: 2, max: 50 })
        .trim()
        .withMessage('Last name must be 2-50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('role')
        .isIn(['DETECTIVE', 'ANALYST', 'SUPERVISOR', 'ADMIN'])
        .withMessage('Invalid role'),
    body('department')
        .isIn(['CYBERCRIME', 'NARCOTICS', 'TERRORISM', 'FINANCIAL', 'GENERAL'])
        .withMessage('Invalid department'),
    body('clearanceLevel')
        .isInt({ min: 1, max: 5 })
        .withMessage('Clearance level must be 1-5')
], validationMiddleware, authController.register);

// GET /api/auth/profile - Get current user profile
router.get('/profile', authMiddleware, authController.getProfile);

// PUT /api/auth/profile - Update user profile
router.put('/profile', authMiddleware, [
    body('firstName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .trim(),
    body('lastName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .trim(),
    body('preferences.theme')
        .optional()
        .isIn(['light', 'dark']),
    body('preferences.timezone')
        .optional()
        .isLength({ min: 1 }),
    body('preferences.notifications.email')
        .optional()
        .isBoolean(),
    body('preferences.notifications.realtime')
        .optional()
        .isBoolean(),
    body('preferences.notifications.suspicious')
        .optional()
        .isBoolean()
], validationMiddleware, authController.updateProfile);

// PUT /api/auth/password - Change password
router.put('/password', authMiddleware, [
    body('currentPassword')
        .isLength({ min: 8 })
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain uppercase, lowercase, number and special character')
], validationMiddleware, authController.changePassword);

// POST /api/auth/logout - User logout
router.post('/logout', authMiddleware, authController.logout);

// GET /api/auth/users - Get all users (Admin/Supervisor only)
router.get('/users', authMiddleware, authController.getAllUsers);

module.exports = router;
