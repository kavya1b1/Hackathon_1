const logger = require('../utils/logger');

const errorMiddleware = (error, req, res, next) => {
    logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user?.badgeNumber || 'anonymous'
    });

    // Default error
    let statusCode = 500;
    let message = 'Internal server error';

    // Mongoose validation error
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
        const errors = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
        }));

        return res.status(statusCode).json({
            success: false,
            message,
            errors
        });
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
        statusCode = 409;
        message = 'Duplicate entry';
        const field = Object.keys(error.keyValue)[0];

        return res.status(statusCode).json({
            success: false,
            message: `${field} already exists`,
            field
        });
    }

    // Mongoose cast error
    if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';

        return res.status(statusCode).json({
            success: false,
            message
        });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Multer errors (file upload)
    if (error.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message = 'File too large';
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
        statusCode = 413;
        message = 'Too many files';
    }

    // Custom API errors
    if (error.statusCode) {
        statusCode = error.statusCode;
        message = error.message;
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

module.exports = errorMiddleware;
