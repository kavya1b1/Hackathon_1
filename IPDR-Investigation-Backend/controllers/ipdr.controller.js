const IPDR = require('../models/ipdr.model');
const SuspiciousActivity = require('../models/suspicious.model');
const { validationResult } = require('express-validator');
const csv = require('fast-csv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `ipdr-${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

class IPDRController {
    // Get all IPDR records with pagination and filtering
    async getAllRecords(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;

            // Build filter
            const filter = {};
            if (req.query.phoneNumber) {
                filter.phoneNumber = new RegExp(req.query.phoneNumber, 'i');
            }
            if (req.query.accessType) {
                filter.accessType = req.query.accessType;
            }
            if (req.query.suspicious !== undefined) {
                filter.suspicious = req.query.suspicious === 'true';
            }
            if (req.query.startDate && req.query.endDate) {
                filter.startTime = {
                    $gte: new Date(req.query.startDate),
                    $lte: new Date(req.query.endDate)
                };
            }

            const records = await IPDR.find(filter)
                .sort({ startTime: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'firstName lastName badgeNumber');

            const total = await IPDR.countDocuments(filter);

            res.json({
                success: true,
                data: records,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total,
                    limit
                }
            });
        } catch (error) {
            logger.error('Error fetching IPDR records:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching records',
                error: error.message
            });
        }
    }

    // Add single IPDR record
    async addRecord(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const recordData = {
                ...req.body,
                createdBy: req.user.id
            };

            const record = new IPDR(recordData);
            await record.save();

            // Check for suspicious activity
            if (record.suspicious) {
                await this.createSuspiciousActivity(record);
            }

            res.status(201).json({
                success: true,
                message: 'IPDR record created successfully',
                data: record
            });
        } catch (error) {
            logger.error('Error creating IPDR record:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating record',
                error: error.message
            });
        }
    }

    // Bulk upload IPDR records from CSV
    async uploadRecords(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const results = [];
            const errors = [];
            let processed = 0;
            let created = 0;

            const stream = fs.createReadStream(req.file.path)
                .pipe(csv.parse({ headers: true }))
                .on('data', async (row) => {
                    try {
                        processed++;

                        // Map CSV headers to model fields
                        const recordData = {
                            privateIP: row.privateIP,
                            privatePort: parseInt(row.privatePort),
                            publicIP: row.publicIP,
                            publicPort: parseInt(row.publicPort),
                            destIP: row.destIP,
                            destPort: parseInt(row.destPort),
                            phoneNumber: row.phoneNumber,
                            imei: row.imei,
                            imsi: row.imsi,
                            startTime: new Date(row.startTime),
                            endTime: new Date(row.endTime),
                            originCellID: row.originCellID,
                            originLat: parseFloat(row.originLat),
                            originLong: parseFloat(row.originLong),
                            uplinkVolume: parseInt(row.uplinkVolume),
                            downlinkVolume: parseInt(row.downlinkVolume),
                            accessType: row.accessType,
                            createdBy: req.user.id
                        };

                        const record = new IPDR(recordData);
                        await record.save();
                        created++;

                        // Check for suspicious activity
                        if (record.suspicious) {
                            await this.createSuspiciousActivity(record);
                        }

                    } catch (error) {
                        errors.push({
                            row: processed,
                            error: error.message,
                            data: row
                        });
                    }
                })
                .on('end', () => {
                    // Clean up uploaded file
                    fs.unlinkSync(req.file.path);

                    res.json({
                        success: true,
                        message: 'IPDR upload completed',
                        summary: {
                            processed,
                            created,
                            errors: errors.length,
                            errorDetails: errors.slice(0, 10) // First 10 errors
                        }
                    });
                });

        } catch (error) {
            logger.error('Error uploading IPDR records:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing upload',
                error: error.message
            });
        }
    }

    // Get records for specific phone number
    async getRecordsByPhone(req, res) {
        try {
            const { phoneNumber } = req.body;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;

            const records = await IPDR.find({ phoneNumber })
                .sort({ startTime: -1 })
                .skip(skip)
                .limit(limit);

            const total = await IPDR.countDocuments({ phoneNumber });

            // Get related records (potential B-party connections)
            const relatedRecords = await IPDR.findRelated(phoneNumber);

            res.json({
                success: true,
                data: {
                    records,
                    relatedRecords: relatedRecords.slice(0, 10), // Limit related records
                    pagination: {
                        current: page,
                        pages: Math.ceil(total / limit),
                        total,
                        limit
                    }
                }
            });
        } catch (error) {
            logger.error('Error fetching records by phone:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching records',
                error: error.message
            });
        }
    }

    // Advanced search with multiple criteria
    async advancedSearch(req, res) {
        try {
            const {
                phoneNumbers,
                ipAddresses,
                imeiNumbers,
                dateRange,
                accessTypes,
                locations,
                dataVolumeRange,
                durationRange,
                suspiciousOnly
            } = req.body;

            const filter = {};

            // Phone numbers
            if (phoneNumbers && phoneNumbers.length > 0) {
                filter.phoneNumber = { $in: phoneNumbers };
            }

            // IP addresses
            if (ipAddresses && ipAddresses.length > 0) {
                filter.$or = [
                    { privateIP: { $in: ipAddresses } },
                    { publicIP: { $in: ipAddresses } },
                    { destIP: { $in: ipAddresses } }
                ];
            }

            // IMEI numbers
            if (imeiNumbers && imeiNumbers.length > 0) {
                filter.imei = { $in: imeiNumbers };
            }

            // Date range
            if (dateRange && dateRange.start && dateRange.end) {
                filter.startTime = {
                    $gte: new Date(dateRange.start),
                    $lte: new Date(dateRange.end)
                };
            }

            // Access types
            if (accessTypes && accessTypes.length > 0) {
                filter.accessType = { $in: accessTypes };
            }

            // Data volume range
            if (dataVolumeRange) {
                filter.totalVolume = {};
                if (dataVolumeRange.min) filter.totalVolume.$gte = dataVolumeRange.min;
                if (dataVolumeRange.max) filter.totalVolume.$lte = dataVolumeRange.max;
            }

            // Suspicious only
            if (suspiciousOnly) {
                filter.suspicious = true;
            }

            const records = await IPDR.find(filter)
                .sort({ startTime: -1 })
                .limit(1000); // Limit to prevent overwhelming responses

            res.json({
                success: true,
                data: records,
                count: records.length,
                searchCriteria: req.body
            });
        } catch (error) {
            logger.error('Error in advanced search:', error);
            res.status(500).json({
                success: false,
                message: 'Error performing search',
                error: error.message
            });
        }
    }

    // Get geographic data for mapping
    async getGeographicData(req, res) {
        try {
            const { bounds, dateRange } = req.body;

            const filter = {};

            // Date range filter
            if (dateRange && dateRange.start && dateRange.end) {
                filter.startTime = {
                    $gte: new Date(dateRange.start),
                    $lte: new Date(dateRange.end)
                };
            }

            // Geographic bounds filter
            if (bounds) {
                filter.location = {
                    $geoWithin: {
                        $box: [
                            [bounds.southwest.lng, bounds.southwest.lat],
                            [bounds.northeast.lng, bounds.northeast.lat]
                        ]
                    }
                };
            }

            const records = await IPDR.find(filter, {
                originLat: 1,
                originLong: 1,
                originCellID: 1,
                phoneNumber: 1,
                startTime: 1,
                suspicious: 1,
                accessType: 1
            }).limit(5000);

            // Group by cell tower for clustering
            const cellGroups = {};
            records.forEach(record => {
                if (!cellGroups[record.originCellID]) {
                    cellGroups[record.originCellID] = {
                        cellID: record.originCellID,
                        lat: record.originLat,
                        lng: record.originLong,
                        count: 0,
                        suspicious: 0,
                        accessTypes: {}
                    };
                }
                cellGroups[record.originCellID].count++;
                if (record.suspicious) cellGroups[record.originCellID].suspicious++;
                cellGroups[record.originCellID].accessTypes[record.accessType] = 
                    (cellGroups[record.originCellID].accessTypes[record.accessType] || 0) + 1;
            });

            res.json({
                success: true,
                data: {
                    points: Object.values(cellGroups),
                    totalRecords: records.length
                }
            });
        } catch (error) {
            logger.error('Error fetching geographic data:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching geographic data',
                error: error.message
            });
        }
    }

    // Helper method to create suspicious activity
    async createSuspiciousActivity(record) {
        try {
            for (const reason of record.suspiciousReasons) {
                const activity = new SuspiciousActivity({
                    type: reason,
                    phoneNumber: record.phoneNumber,
                    imei: record.imei,
                    imsi: record.imsi,
                    description: this.getSuspiciousDescription(reason, record),
                    firstOccurrence: record.startTime,
                    lastOccurrence: record.endTime,
                    ipdrRecords: [record._id],
                    severity: this.getSeverity(reason),
                    confidence: 0.8
                });

                await activity.save();
            }
        } catch (error) {
            logger.error('Error creating suspicious activity:', error);
        }
    }

    // Helper methods
    getSuspiciousDescription(reason, record) {
        const descriptions = {
            HIGH_NIGHT_ACTIVITY: `High frequency communications during night hours (${record.startTime.getHours()}:00)`,
            UNUSUAL_DATA_VOLUME: `Unusual data volume: ${record.totalVolume} bytes`,
            SHORT_DURATION_FREQUENT: `Short duration session: ${record.duration}ms`,
            MULTIPLE_DEVICES: `Multiple device usage detected for ${record.phoneNumber}`
        };
        return descriptions[reason] || 'Suspicious pattern detected';
    }

    getSeverity(reason) {
        const severityMap = {
            HIGH_NIGHT_ACTIVITY: 'MEDIUM',
            UNUSUAL_DATA_VOLUME: 'HIGH',
            SHORT_DURATION_FREQUENT: 'HIGH',
            MULTIPLE_DEVICES: 'CRITICAL'
        };
        return severityMap[reason] || 'MEDIUM';
    }
}

module.exports = new IPDRController();
