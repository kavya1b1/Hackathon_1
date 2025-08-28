const express = require('express');
const { query } = require('express-validator');
const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/analytics/dashboard - Get dashboard statistics
router.get('/dashboard', [
    query('dateRange')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Date range must be 1-365 days')
], validationMiddleware, analyticsController.getDashboardStats);

// GET /api/analytics/trends - Get activity trends
router.get('/trends', [
    query('period')
        .optional()
        .isIn(['hourly', 'daily', 'weekly', 'monthly'])
        .withMessage('Period must be hourly, daily, weekly, or monthly'),
    query('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Days must be 1-365')
], validationMiddleware, analyticsController.getActivityTrends);

// GET /api/analytics/top-communicators - Get top communicators
router.get('/top-communicators', [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be 1-100'),
    query('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Days must be 1-365')
], validationMiddleware, analyticsController.getTopCommunicators);

// GET /api/analytics/relationships - Get network relationships
router.get('/relationships', [
    query('phoneNumber')
        .notEmpty()
        .matches(/^[0-9]{10,15}$/)
        .withMessage('Valid phone number is required'),
    query('depth')
        .optional()
        .isInt({ min: 1, max: 3 })
        .withMessage('Depth must be 1-3'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be 1-100')
], validationMiddleware, analyticsController.getNetworkRelationships);

// GET /api/analytics/suspicious - Get suspicious activity analytics
router.get('/suspicious', [
    query('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Days must be 1-365')
], validationMiddleware, analyticsController.getSuspiciousAnalytics);

module.exports = router;
