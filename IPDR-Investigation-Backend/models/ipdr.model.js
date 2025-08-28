const mongoose = require('mongoose');

const IPDRSchema = new mongoose.Schema({
    // Network Information
    privateIP: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v);
            },
            message: 'Invalid IP address format'
        }
    },
    privatePort: {
        type: Number,
        required: true,
        min: 1,
        max: 65535
    },
    publicIP: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v);
            },
            message: 'Invalid IP address format'
        }
    },
    publicPort: {
        type: Number,
        required: true,
        min: 1,
        max: 65535
    },
    destIP: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v);
            },
            message: 'Invalid IP address format'
        }
    },
    destPort: {
        type: Number,
        required: true,
        min: 1,
        max: 65535
    },

    // User Information
    phoneNumber: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{10,15}$/.test(v);
            },
            message: 'Invalid phone number format'
        },
        index: true
    },
    imei: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{15}$/.test(v);
            },
            message: 'IMEI must be 15 digits'
        },
        index: true
    },
    imsi: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{15}$/.test(v);
            },
            message: 'IMSI must be 15 digits'
        },
        index: true
    },

    // Time Information
    startTime: {
        type: Date,
        required: true,
        index: true
    },
    endTime: {
        type: Date,
        required: true,
        validate: {
            validator: function(v) {
                return v > this.startTime;
            },
            message: 'End time must be after start time'
        }
    },
    duration: {
        type: Number,
        default: function() {
            return this.endTime - this.startTime;
        }
    },

    // Location Information
    originCellID: {
        type: String,
        required: true,
        index: true
    },
    originLat: {
        type: Number,
        required: true,
        min: -90,
        max: 90
    },
    originLong: {
        type: Number,
        required: true,
        min: -180,
        max: 180
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: function() {
                return [this.originLong, this.originLat];
            }
        }
    },

    // Data Volume Information
    uplinkVolume: {
        type: Number,
        required: true,
        min: 0
    },
    downlinkVolume: {
        type: Number,
        required: true,
        min: 0
    },
    totalVolume: {
        type: Number,
        default: function() {
            return this.uplinkVolume + this.downlinkVolume;
        }
    },

    // Network Type
    accessType: {
        type: String,
        required: true,
        enum: ['2G', '3G', '4G', '5G'],
        index: true
    },

    // Analysis Fields
    suspicious: {
        type: Boolean,
        default: false,
        index: true
    },
    suspiciousReasons: [{
        type: String,
        enum: [
            'HIGH_NIGHT_ACTIVITY',
            'UNUSUAL_DATA_VOLUME',
            'MULTIPLE_DEVICES',
            'LOCATION_ANOMALY',
            'SHORT_DURATION_FREQUENT',
            'FOREIGN_IP_COMMUNICATION'
        ]
    }],

    // Relationship mapping
    relatedRecords: [{
        recordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IPDR'
        },
        relationship: {
            type: String,
            enum: ['A_TO_B', 'B_TO_A', 'MUTUAL']
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1
        }
    }],

    // Investigation metadata
    investigationStatus: {
        type: String,
        enum: ['NORMAL', 'FLAGGED', 'UNDER_INVESTIGATION', 'CLEARED'],
        default: 'NORMAL',
        index: true
    },
    tags: [String],
    notes: String,

    // Audit fields
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastAnalyzedAt: Date
}, {
    timestamps: true
});

// Indexes for performance
IPDRSchema.index({ phoneNumber: 1, startTime: -1 });
IPDRSchema.index({ location: '2dsphere' });
IPDRSchema.index({ startTime: 1, endTime: 1 });
IPDRSchema.index({ suspicious: 1, investigationStatus: 1 });
IPDRSchema.index({ imei: 1, imsi: 1 });
IPDRSchema.index({ 'privateIP': 1, 'publicIP': 1, 'destIP': 1 });

// Virtual for session duration in minutes
IPDRSchema.virtual('durationMinutes').get(function() {
    return Math.round((this.endTime - this.startTime) / (1000 * 60));
});

// Method to check if record is suspicious
IPDRSchema.methods.checkSuspicious = function() {
    const reasons = [];

    // Check for night activity (10 PM to 6 AM)
    const hour = this.startTime.getHours();
    if (hour >= 22 || hour <= 6) {
        reasons.push('HIGH_NIGHT_ACTIVITY');
    }

    // Check for unusual data volume (above 10MB)
    if (this.totalVolume > 10485760) {
        reasons.push('UNUSUAL_DATA_VOLUME');
    }

    // Check for short duration (less than 30 seconds)
    if (this.duration < 30000) {
        reasons.push('SHORT_DURATION_FREQUENT');
    }

    this.suspicious = reasons.length > 0;
    this.suspiciousReasons = reasons;

    return this.suspicious;
};

// Static method to find related records
IPDRSchema.statics.findRelated = async function(phoneNumber, timeRange = 3600000) {
    const records = await this.find({
        $or: [
            { phoneNumber: phoneNumber },
            { 'relatedRecords.recordId': { $in: await this.distinct('_id', { phoneNumber }) } }
        ]
    }).populate('relatedRecords.recordId');

    return records;
};

// Pre-save middleware
IPDRSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    this.totalVolume = this.uplinkVolume + this.downlinkVolume;
    this.duration = this.endTime - this.startTime;
    this.location.coordinates = [this.originLong, this.originLat];
    this.checkSuspicious();
    next();
});

module.exports = mongoose.model('IPDR', IPDRSchema);
