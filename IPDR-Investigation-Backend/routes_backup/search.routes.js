const express = require('express');
const { body, query } = require('express-validator');
const IPDR = require('../models/ipdr.model');
const SuspiciousActivity = require('../models/suspicious.model');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// POST /api/search/global - Global search across all entities
router.post('/global', [
    body('query')
        .notEmpty()
        .isLength({ min: 3, max: 100 })
        .withMessage('Search query must be 3-100 characters'),
    body('filters.entityTypes')
        .optional()
        .isArray()
        .withMessage('Entity types must be an array'),
    body('filters.entityTypes.*')
        .optional()
        .isIn(['phone', 'ip', 'imei', 'imsi', 'cell'])
        .withMessage('Invalid entity type'),
    body('filters.dateRange.start')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date'),
    body('filters.dateRange.end')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date'),
    body('filters.suspiciousOnly')
        .optional()
        .isBoolean()
        .withMessage('Suspicious only must be boolean')
], validationMiddleware, async (req, res) => {
    try {
        const { query: searchQuery, filters = {} } = req.body;
        const { entityTypes = ['phone', 'ip', 'imei', 'imsi'], dateRange, suspiciousOnly } = filters;

        const searchResults = {
            phoneNumbers: [],
            ipAddresses: [],
            imeiNumbers: [],
            imsiNumbers: [],
            cellTowers: []
        };

        // Build base filter
        const baseFilter = {};
        if (dateRange?.start && dateRange?.end) {
            baseFilter.startTime = {
                $gte: new Date(dateRange.start),
                $lte: new Date(dateRange.end)
            };
        }
        if (suspiciousOnly) {
            baseFilter.suspicious = true;
        }

        // Search phone numbers
        if (entityTypes.includes('phone')) {
            searchResults.phoneNumbers = await IPDR.find({
                ...baseFilter,
                phoneNumber: new RegExp(searchQuery, 'i')
            }).limit(20).select('phoneNumber startTime suspicious accessType');
        }

        // Search IP addresses
        if (entityTypes.includes('ip')) {
            searchResults.ipAddresses = await IPDR.find({
                ...baseFilter,
                $or: [
                    { privateIP: new RegExp(searchQuery, 'i') },
                    { publicIP: new RegExp(searchQuery, 'i') },
                    { destIP: new RegExp(searchQuery, 'i') }
                ]
            }).limit(20).select('privateIP publicIP destIP startTime suspicious');
        }

        // Search IMEI numbers
        if (entityTypes.includes('imei')) {
            searchResults.imeiNumbers = await IPDR.find({
                ...baseFilter,
                imei: new RegExp(searchQuery, 'i')
            }).limit(20).select('imei phoneNumber startTime suspicious');
        }

        // Search IMSI numbers
        if (entityTypes.includes('imsi')) {
            searchResults.imsiNumbers = await IPDR.find({
                ...baseFilter,
                imsi: new RegExp(searchQuery, 'i')
            }).limit(20).select('imsi phoneNumber startTime suspicious');
        }

        // Search cell towers
        if (entityTypes.includes('cell')) {
            searchResults.cellTowers = await IPDR.find({
                ...baseFilter,
                originCellID: new RegExp(searchQuery, 'i')
            }).limit(20).select('originCellID originLat originLong phoneNumber startTime');
        }

        // Get total count for each category
        const totalCounts = {
            phoneNumbers: searchResults.phoneNumbers.length,
            ipAddresses: searchResults.ipAddresses.length,
            imeiNumbers: searchResults.imeiNumbers.length,
            imsiNumbers: searchResults.imsiNumbers.length,
            cellTowers: searchResults.cellTowers.length
        };

        logger.info(`Global search performed by ${req.user.badgeNumber}: "${searchQuery}"`);

        res.json({
            success: true,
            data: searchResults,
            counts: totalCounts,
            query: searchQuery,
            filters
        });
    } catch (error) {
        logger.error('Global search error:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing search',
            error: error.message
        });
    }
});

// GET /api/search/suggestions - Get search suggestions
router.get('/suggestions', [
    query('q')
        .notEmpty()
        .isLength({ min: 2, max: 50 })
        .withMessage('Query must be 2-50 characters'),
    query('type')
        .optional()
        .isIn(['phone', 'ip', 'imei', 'imsi', 'cell'])
        .withMessage('Invalid type')
], validationMiddleware, async (req, res) => {
    try {
        const { q, type } = req.query;
        const suggestions = [];

        if (!type || type === 'phone') {
            const phones = await IPDR.distinct('phoneNumber', {
                phoneNumber: new RegExp(`^${q}`, 'i')
            });
            suggestions.push(...phones.slice(0, 5).map(phone => ({
                value: phone,
                type: 'phone',
                label: `Phone: ${phone}`
            })));
        }

        if (!type || type === 'ip') {
            const ips = await IPDR.aggregate([
                { $match: {
                    $or: [
                        { privateIP: new RegExp(`^${q}`, 'i') },
                        { publicIP: new RegExp(`^${q}`, 'i') },
                        { destIP: new RegExp(`^${q}`, 'i') }
                    ]
                }},
                { $group: {
                    _id: null,
                    privateIPs: { $addToSet: '$privateIP' },
                    publicIPs: { $addToSet: '$publicIP' },
                    destIPs: { $addToSet: '$destIP' }
                }}
            ]);

            if (ips.length > 0) {
                const allIPs = [...ips[0].privateIPs, ...ips[0].publicIPs, ...ips[0].destIPs]
                    .filter(ip => ip.startsWith(q))
                    .slice(0, 5);

                suggestions.push(...allIPs.map(ip => ({
                    value: ip,
                    type: 'ip',
                    label: `IP: ${ip}`
                })));
            }
        }

        if (!type || type === 'cell') {
            const cells = await IPDR.distinct('originCellID', {
                originCellID: new RegExp(`^${q}`, 'i')
            });
            suggestions.push(...cells.slice(0, 3).map(cell => ({
                value: cell,
                type: 'cell',
                label: `Cell: ${cell}`
            })));
        }

        res.json({
            success: true,
            data: suggestions.slice(0, 10), // Limit total suggestions
            query: q
        });
    } catch (error) {
        logger.error('Search suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching suggestions',
            error: error.message
        });
    }
});

// POST /api/search/export - Export search results
router.post('/export', [
    body('searchCriteria')
        .notEmpty()
        .withMessage('Search criteria is required'),
    body('format')
        .isIn(['csv', 'json'])
        .withMessage('Format must be csv or json'),
    body('includeFields')
        .optional()
        .isArray()
        .withMessage('Include fields must be an array')
], validationMiddleware, async (req, res) => {
    try {
        const { searchCriteria, format, includeFields } = req.body;

        // Perform search based on criteria
        const records = await IPDR.find(searchCriteria).limit(10000); // Limit for performance

        if (format === 'csv') {
            const csv = require('fast-csv');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="ipdr_export.csv"');

            const csvStream = csv.format({ headers: true });
            csvStream.pipe(res);

            records.forEach(record => {
                csvStream.write(record.toObject());
            });

            csvStream.end();
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="ipdr_export.json"');

            res.json({
                exportDate: new Date().toISOString(),
                totalRecords: records.length,
                searchCriteria,
                data: records
            });
        }

        logger.info(`Data export performed by ${req.user.badgeNumber}: ${format}, ${records.length} records`);
    } catch (error) {
        logger.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting data',
            error: error.message
        });
    }
});

module.exports = router;
