const express = require('express');
const { body, query } = require('express-validator');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const ipdrController = require('../controllers/ipdr.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/ipdr/records - Get all IPDR records with filtering
router.get('/records', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('phoneNumber').optional().isLength({ min: 10 }),
    query('accessType').optional().isIn(['2G', '3G', '4G', '5G']),
    query('suspicious').optional().isBoolean(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
], validationMiddleware, ipdrController.getAllRecords);

// POST /api/ipdr/records - Add single IPDR record
router.post('/records', [
    body('privateIP').isIP(),
    body('privatePort').isInt({ min: 1, max: 65535 }),
    body('publicIP').isIP(),
    body('publicPort').isInt({ min: 1, max: 65535 }),
    body('destIP').isIP(),
    body('destPort').isInt({ min: 1, max: 65535 }),
    body('phoneNumber').matches(/^[0-9]{10,15}$/),
    body('imei').matches(/^[0-9]{15}$/),
    body('imsi').matches(/^[0-9]{15}$/),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
    body('originCellID').notEmpty(),
    body('originLat').isFloat({ min: -90, max: 90 }),
    body('originLong').isFloat({ min: -180, max: 180 }),
    body('uplinkVolume').isInt({ min: 0 }),
    body('downlinkVolume').isInt({ min: 0 }),
    body('accessType').isIn(['2G', '3G', '4G', '5G'])
], validationMiddleware, ipdrController.addRecord);

// POST /api/ipdr/upload - Bulk upload IPDR records from CSV




// POST /api/ipdr/search/phone - Get records for specific phone number
router.post('/search/phone', [
    body('phoneNumber').matches(/^[0-9]{10,15}$/),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 1000 })
], validationMiddleware, ipdrController.getRecordsByPhone);

// POST /api/ipdr/search/advanced - Advanced search with multiple criteria
router.post('/search/advanced', [
    body('phoneNumbers').optional().isArray(),
    body('phoneNumbers.*').optional().matches(/^[0-9]{10,15}$/),
    body('ipAddresses').optional().isArray(),
    body('ipAddresses.*').optional().isIP(),
    body('imeiNumbers').optional().isArray(),
    body('imeiNumbers.*').optional().matches(/^[0-9]{15}$/),
    body('dateRange.start').optional().isISO8601(),
    body('dateRange.end').optional().isISO8601(),
    body('accessTypes').optional().isArray(),
    body('accessTypes.*').optional().isIn(['2G', '3G', '4G', '5G']),
    body('dataVolumeRange.min').optional().isInt({ min: 0 }),
    body('dataVolumeRange.max').optional().isInt({ min: 0 }),
    body('suspiciousOnly').optional().isBoolean()
], validationMiddleware, ipdrController.advancedSearch);

// POST /api/ipdr/geographic - Get geographic data for mapping
router.post('/geographic', [
    body('bounds.southwest.lat').optional().isFloat({ min: -90, max: 90 }),
    body('bounds.southwest.lng').optional().isFloat({ min: -180, max: 180 }),
    body('bounds.northeast.lat').optional().isFloat({ min: -90, max: 90 }),
    body('bounds.northeast.lng').optional().isFloat({ min: -180, max: 180 }),
    body('dateRange.start').optional().isISO8601(),
    body('dateRange.end').optional().isISO8601()
], validationMiddleware, ipdrController.getGeographicData);



router.post('/upload', upload.single('csv'), (req, res) => {
    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', data => results.push(data))
        .on('end', () => {
            fs.unlinkSync(req.file.path); // Clean up uploaded file

            // TODO: Analysis step — here you would run your suspicious pattern detection.
            // For now, just return row count and preview:
            res.json({
                status: 'success',
                rows: results.length,
                preview: results.slice(0,5)
                // Add custom analytics results here!
            });
        })
        .on('error', err => res.status(400).json({ status: 'error', message: err.message }));
});

module.exports = router;


