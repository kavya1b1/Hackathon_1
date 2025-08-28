const IPDR = require('../models/ipdr.model');
const SuspiciousActivity = require('../models/suspicious.model');
const Investigation = require('../models/investigation.model');
const logger = require('../utils/logger');

class AnalyticsController {
    // Get dashboard statistics
    async getDashboardStats(req, res) {
        try {
            const dateRange = req.query.dateRange || 30; // days
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - dateRange);

            // Parallel queries for better performance
            const [
                totalRecords,
                uniquePhoneNumbers,
                uniqueIPs,
                totalDataVolume,
                suspiciousActivities,
                activeInvestigations,
                accessTypeBreakdown,
                recentActivity
            ] = await Promise.all([
                IPDR.countDocuments({
                    createdAt: { $gte: startDate }
                }),
                IPDR.distinct('phoneNumber', {
                    createdAt: { $gte: startDate }
                }),
                IPDR.aggregate([
                    { $match: { createdAt: { $gte: startDate } } },
                    { $group: {
                        _id: null,
                        privateIPs: { $addToSet: '$privateIP' },
                        publicIPs: { $addToSet: '$publicIP' },
                        destIPs: { $addToSet: '$destIP' }
                    }}
                ]),
                IPDR.aggregate([
                    { $match: { createdAt: { $gte: startDate } } },
                    { $group: {
                        _id: null,
                        total: { $sum: '$totalVolume' }
                    }}
                ]),
                SuspiciousActivity.countDocuments({
                    detectedAt: { $gte: startDate },
                    status: { $ne: 'RESOLVED' }
                }),
                Investigation.countDocuments({
                    status: { $in: ['OPEN', 'ACTIVE'] }
                }),
                IPDR.aggregate([
                    { $match: { createdAt: { $gte: startDate } } },
                    { $group: {
                        _id: '$accessType',
                        count: { $sum: 1 }
                    }}
                ]),
                IPDR.find({
                    createdAt: { $gte: startDate }
                })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('phoneNumber startTime accessType suspicious')
            ]);

            // Process unique IPs
            const allIPs = new Set();
            if (uniqueIPs.length > 0) {
                uniqueIPs[0].privateIPs.forEach(ip => allIPs.add(ip));
                uniqueIPs[0].publicIPs.forEach(ip => allIPs.add(ip));
                uniqueIPs[0].destIPs.forEach(ip => allIPs.add(ip));
            }

            // Format data volume
            const formatDataVolume = (bytes) => {
                if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
                if (bytes > 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
                if (bytes > 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
                return `${bytes} B`;
            };

            const stats = {
                totalRecords,
                uniquePhoneNumbers: uniquePhoneNumbers.length,
                uniqueIPs: allIPs.size,
                totalDataVolume: formatDataVolume(
                    totalDataVolume.length > 0 ? totalDataVolume[0].total : 0
                ),
                suspiciousActivities,
                activeInvestigations,
                accessTypeBreakdown: accessTypeBreakdown.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                recentActivity: recentActivity.map(record => ({
                    phoneNumber: record.phoneNumber,
                    timestamp: record.startTime,
                    accessType: record.accessType,
                    suspicious: record.suspicious
                })),
                dateRange: `${dateRange} days`
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error fetching dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching statistics',
                error: error.message
            });
        }
    }

    // Get time-based activity trends
    async getActivityTrends(req, res) {
        try {
            const { period = 'daily', days = 30 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            let groupBy;
            switch (period) {
                case 'hourly':
                    groupBy = {
                        year: { $year: '$startTime' },
                        month: { $month: '$startTime' },
                        day: { $dayOfMonth: '$startTime' },
                        hour: { $hour: '$startTime' }
                    };
                    break;
                case 'daily':
                    groupBy = {
                        year: { $year: '$startTime' },
                        month: { $month: '$startTime' },
                        day: { $dayOfMonth: '$startTime' }
                    };
                    break;
                case 'weekly':
                    groupBy = {
                        year: { $year: '$startTime' },
                        week: { $week: '$startTime' }
                    };
                    break;
                default:
                    groupBy = {
                        year: { $year: '$startTime' },
                        month: { $month: '$startTime' }
                    };
            }

            const trends = await IPDR.aggregate([
                { $match: { startTime: { $gte: startDate } } },
                { $group: {
                    _id: groupBy,
                    count: { $sum: 1 },
                    dataVolume: { $sum: '$totalVolume' },
                    suspiciousCount: {
                        $sum: { $cond: ['$suspicious', 1, 0] }
                    }
                }},
                { $sort: { '_id': 1 } }
            ]);

            res.json({
                success: true,
                data: trends,
                period,
                days
            });
        } catch (error) {
            logger.error('Error fetching activity trends:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching trends',
                error: error.message
            });
        }
    }

    // Get top communicators
    async getTopCommunicators(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const days = parseInt(req.query.days) || 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const topCommunicators = await IPDR.aggregate([
                { $match: { startTime: { $gte: startDate } } },
                { $group: {
                    _id: '$phoneNumber',
                    totalSessions: { $sum: 1 },
                    totalDataVolume: { $sum: '$totalVolume' },
                    suspiciousCount: {
                        $sum: { $cond: ['$suspicious', 1, 0] }
                    },
                    uniqueDestinations: { $addToSet: '$destIP' },
                    accessTypes: { $addToSet: '$accessType' },
                    firstSeen: { $min: '$startTime' },
                    lastSeen: { $max: '$startTime' }
                }},
                { $project: {
                    phoneNumber: '$_id',
                    totalSessions: 1,
                    totalDataVolume: 1,
                    suspiciousCount: 1,
                    uniqueDestinations: { $size: '$uniqueDestinations' },
                    accessTypes: 1,
                    firstSeen: 1,
                    lastSeen: 1,
                    riskScore: {
                        $add: [
                            { $multiply: ['$suspiciousCount', 10] },
                            { $divide: ['$totalSessions', 100] }
                        ]
                    }
                }},
                { $sort: { riskScore: -1, totalSessions: -1 } },
                { $limit: limit }
            ]);

            res.json({
                success: true,
                data: topCommunicators,
                limit,
                days
            });
        } catch (error) {
            logger.error('Error fetching top communicators:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching top communicators',
                error: error.message
            });
        }
    }

    // Get network relationships
    async getNetworkRelationships(req, res) {
        try {
            const { phoneNumber, depth = 2, limit = 50 } = req.query;

            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is required'
                });
            }

            // Get direct connections
            const connections = await IPDR.aggregate([
                { $match: { phoneNumber } },
                { $group: {
                    _id: '$destIP',
                    frequency: { $sum: 1 },
                    totalDuration: { $sum: '$duration' },
                    totalDataExchange: { $sum: '$totalVolume' },
                    firstContact: { $min: '$startTime' },
                    lastContact: { $max: '$startTime' },
                    suspicious: { $max: '$suspicious' }
                }},
                { $sort: { frequency: -1 } },
                { $limit: limit }
            ]);

            // Find related phone numbers for each destination
            const relationships = [];
            for (const conn of connections) {
                const relatedPhones = await IPDR.distinct('phoneNumber', {
                    destIP: conn._id,
                    phoneNumber: { $ne: phoneNumber }
                });

                relationships.push({
                    aParty: phoneNumber,
                    destIP: conn._id,
                    bParties: relatedPhones.slice(0, 5), // Limit to prevent explosion
                    frequency: conn.frequency,
                    totalDuration: conn.totalDuration,
                    dataExchanged: conn.totalDataExchange,
                    firstContact: conn.firstContact,
                    lastContact: conn.lastContact,
                    strength: conn.frequency > 10 ? 'HIGH' : 
                             conn.frequency > 5 ? 'MEDIUM' : 'LOW',
                    suspicious: conn.suspicious
                });
            }

            res.json({
                success: true,
                data: relationships,
                centerNode: phoneNumber,
                depth,
                limit
            });
        } catch (error) {
            logger.error('Error fetching network relationships:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching relationships',
                error: error.message
            });
        }
    }

    // Get suspicious activity analytics
    async getSuspiciousAnalytics(req, res) {
        try {
            const days = parseInt(req.query.days) || 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const [
                typeBreakdown,
                severityBreakdown,
                statusBreakdown,
                trendData,
                topTargets
            ] = await Promise.all([
                SuspiciousActivity.aggregate([
                    { $match: { detectedAt: { $gte: startDate } } },
                    { $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        avgRiskScore: { $avg: '$riskScore' }
                    }},
                    { $sort: { count: -1 } }
                ]),
                SuspiciousActivity.aggregate([
                    { $match: { detectedAt: { $gte: startDate } } },
                    { $group: {
                        _id: '$severity',
                        count: { $sum: 1 }
                    }}
                ]),
                SuspiciousActivity.aggregate([
                    { $match: { detectedAt: { $gte: startDate } } },
                    { $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }}
                ]),
                SuspiciousActivity.aggregate([
                    { $match: { detectedAt: { $gte: startDate } } },
                    { $group: {
                        _id: {
                            year: { $year: '$detectedAt' },
                            month: { $month: '$detectedAt' },
                            day: { $dayOfMonth: '$detectedAt' }
                        },
                        count: { $sum: 1 }
                    }},
                    { $sort: { '_id': 1 } }
                ]),
                SuspiciousActivity.aggregate([
                    { $match: { detectedAt: { $gte: startDate } } },
                    { $group: {
                        _id: '$phoneNumber',
                        count: { $sum: 1 },
                        avgRiskScore: { $avg: '$riskScore' },
                        types: { $addToSet: '$type' },
                        maxSeverity: { $max: '$severity' }
                    }},
                    { $sort: { count: -1, avgRiskScore: -1 } },
                    { $limit: 10 }
                ])
            ]);

            res.json({
                success: true,
                data: {
                    typeBreakdown,
                    severityBreakdown,
                    statusBreakdown,
                    trendData,
                    topTargets
                },
                period: `${days} days`
            });
        } catch (error) {
            logger.error('Error fetching suspicious analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching suspicious analytics',
                error: error.message
            });
        }
    }
}

module.exports = new AnalyticsController();
