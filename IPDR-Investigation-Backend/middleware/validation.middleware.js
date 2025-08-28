const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const validationMiddleware = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        logger.warn(`Validation failed for ${req.method} ${req.path}:`, {
            errors: errors.array(),
            user: req.user?.badgeNumber || 'anonymous',
            ip: req.ip
        });

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.param,
                value: error.value,
                message: error.msg,
                location: error.location
            }))
        });
    }

    next();
};

module.exports = validationMiddleware;
