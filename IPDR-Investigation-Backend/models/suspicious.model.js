const mongoose = require('mongoose');

const SuspiciousActivitySchema = new mongoose.Schema({
    // Activity Identification
    activityId: {
        type: String,
        required: true,
        unique: true,
        default: function() {
            return `SA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
    },

    // Type and Classification
    type: {
        type: String,
        required: true,
        enum: [
            'HIGH_NIGHT_ACTIVITY',
            'UNUSUAL_DATA_VOLUME',
            'MULTIPLE_DEVICES',
            'LOCATION_ANOMALY',
            'SHORT_DURATION_FREQUENT',
            'FOREIGN_IP_COMMUNICATION',
            'BURST_COMMUNICATION',
            'PATTERN_DEVIATION',
            'ENCRYPTION_DETECTED'
        ]
    },
    severity: {
        type: String,
        required: true,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
        default: 0.5
    },

    // Subject Information
    phoneNumber: {
        type: String,
        required: true,
        index: true
    },
    imei: String,
    imsi: String,
    relatedIPs: [String],

    // Activity Details
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    details: {
        count: Number,
        duration: Number,
        volume: Number,
        timePattern: String,
        locationPattern: String,
        frequency: Number,
        metadata: mongoose.Schema.Types.Mixed
    },

    // Related Records
    ipdrRecords: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IPDR'
    }],

    // Time Information
    detectedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    firstOccurrence: {
        type: Date,
        required: true
    },
    lastOccurrence: {
        type: Date,
        required: true
    },

    // Investigation Status
    status: {
        type: String,
        required: true,
        enum: ['NEW', 'FLAGGED', 'UNDER_INVESTIGATION', 'RESOLVED', 'FALSE_POSITIVE'],
        default: 'NEW',
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    investigation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Investigation'
    },

    // Analysis
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: function() {
            const severityMap = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };
            return severityMap[this.severity] * this.confidence;
        }
    },
    automaticDetection: {
        type: Boolean,
        default: true
    },
    algorithm: String,

    // Follow-up Actions
    actions: [{
        action: {
            type: String,
            enum: ['NOTIFY', 'ESCALATE', 'INVESTIGATE', 'MONITOR', 'BLOCK', 'FLAG']
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        performedAt: {
            type: Date,
            default: Date.now
        },
        notes: String
    }],

    // Notes and Comments
    notes: [{
        content: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Resolution
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolution: String,

    // Audit
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for performance
SuspiciousActivitySchema.index({ phoneNumber: 1, detectedAt: -1 });
SuspiciousActivitySchema.index({ type: 1, severity: 1 });
SuspiciousActivitySchema.index({ status: 1, assignedTo: 1 });
SuspiciousActivitySchema.index({ riskScore: -1 });

// Virtual for activity age
SuspiciousActivitySchema.virtual('ageInHours').get(function() {
    return Math.floor((Date.now() - this.detectedAt) / (1000 * 60 * 60));
});

// Method to add action
SuspiciousActivitySchema.methods.addAction = function(action, userId, notes) {
    this.actions.push({
        action,
        performedBy: userId,
        notes
    });

    return this.save();
};

// Method to resolve activity
SuspiciousActivitySchema.methods.resolve = function(resolution, userId) {
    this.status = 'RESOLVED';
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    this.resolution = resolution;

    return this.save();
};

// Static method to find by risk level
SuspiciousActivitySchema.statics.findByRiskLevel = function(minRisk = 50) {
    return this.find({
        riskScore: { $gte: minRisk },
        status: { $ne: 'RESOLVED' }
    }).sort({ riskScore: -1, detectedAt: -1 });
};

module.exports = mongoose.model('SuspiciousActivity', SuspiciousActivitySchema);
