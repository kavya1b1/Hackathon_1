const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class AuthController {
    // User login
    async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            // Find user by email
            const user = await User.findOne({ email, isActive: true });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Check if account is locked
            if (user.isLocked) {
                return res.status(423).json({
                    success: false,
                    message: 'Account is temporarily locked. Please try again later.'
                });
            }

            // Verify password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                await user.incrementLoginAttempts();
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Reset login attempts on successful login
            if (user.loginAttempts > 0) {
                await user.resetLoginAttempts();
            }

            // Update last login
            user.lastLogin = new Date();
            user.lastActivity = new Date();
            await user.save();

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user._id,
                    badgeNumber: user.badgeNumber,
                    role: user.role,
                    department: user.department,
                    clearanceLevel: user.clearanceLevel
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: process.env.JWT_EXPIRE || '8h' }
            );

            logger.info(`User logged in: ${user.badgeNumber} (${user.email})`);

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user._id,
                    badgeNumber: user.badgeNumber,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    clearanceLevel: user.clearanceLevel,
                    preferences: user.preferences
                }
            });
        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // User registration (Admin only)
    async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {
                badgeNumber,
                firstName,
                lastName,
                email,
                password,
                role,
                department,
                clearanceLevel
            } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [{ email }, { badgeNumber }]
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this email or badge number already exists'
                });
            }

            // Create new user
            const user = new User({
                badgeNumber,
                firstName,
                lastName,
                email,
                password,
                role,
                department,
                clearanceLevel
            });

            await user.save();

            logger.info(`New user registered: ${badgeNumber} by ${req.user.badgeNumber}`);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: {
                    id: user._id,
                    badgeNumber: user.badgeNumber,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    department: user.department
                }
            });
        } catch (error) {
            logger.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating user',
                error: error.message
            });
        }
    }

    // Get current user profile
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id)
                .select('-password')
                .populate('investigationsAssigned', 'caseNumber title status priority');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            logger.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching profile',
                error: error.message
            });
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const allowedUpdates = ['firstName', 'lastName', 'preferences'];
            const updates = {};

            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            const user = await User.findByIdAndUpdate(
                req.user.id,
                updates,
                { new: true, runValidators: true }
            ).select('-password');

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: user
            });
        } catch (error) {
            logger.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating profile',
                error: error.message
            });
        }
    }

    // Change password
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            const user = await User.findById(req.user.id);

            // Verify current password
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Update password
            user.password = newPassword;
            await user.save();

            logger.info(`Password changed for user: ${user.badgeNumber}`);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            logger.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Error changing password',
                error: error.message
            });
        }
    }

    // Logout (blacklist token - would require Redis in production)
    async logout(req, res) {
        try {
            // Update last activity
            await User.findByIdAndUpdate(req.user.id, {
                lastActivity: new Date()
            });

            logger.info(`User logged out: ${req.user.badgeNumber}`);

            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            logger.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Error during logout',
                error: error.message
            });
        }
    }

    // Get all users (Admin/Supervisor only)
    async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const filter = {};
            if (req.query.role) filter.role = req.query.role;
            if (req.query.department) filter.department = req.query.department;
            if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';

            const users = await User.find(filter)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await User.countDocuments(filter);

            res.json({
                success: true,
                data: users,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total,
                    limit
                }
            });
        } catch (error) {
            logger.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching users',
                error: error.message
            });
        }
    }
}

module.exports = new AuthController();
