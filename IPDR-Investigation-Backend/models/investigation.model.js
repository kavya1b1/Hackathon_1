const mongoose = require('mongoose');

const InvestigationSchema = new mongoose.Schema({
    // Case Information
    caseNumber: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[A-Z]{2,4}-[0-9]{4}-[0-9]{6}$/.test(v);
            },
            message: 'Case number format: DEPT-YEAR-NUMBER (e.g., CYB-2024-001234)'
        }
    },
    title: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        minlength: 20,
        maxlength: 2000
    },

    // Classification
    type: {
        type: String,
        required: true,
        enum: [
            'CYBERCRIME',
            'TERRORISM',
            'DRUG_TRAFFICKING',
            'FINANCIAL_CRIME',
            'HUMAN_TRAFFICKING',
            'GENERAL_INVESTIGATION'
        ]
    },
    priority: {
        type: String,
        required: true,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },
    classification: {
        type: String,
        required: true,
        enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'],
        default: 'CONFIDENTIAL'
    },

    // Status
    status: {
        type: String,
        required: true,
        enum: ['OPEN', 'ACTIVE', 'PENDING', 'CLOSED', 'SUSPENDED'],
        default: 'OPEN'
    },

    // Personnel
    assignedTo: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['LEAD_INVESTIGATOR', 'INVESTIGATOR', 'ANALYST', 'SUPERVISOR'],
            required: true
        },
        assignedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Related Data
    phoneNumbers: [{
        number: String,
        type: {
            type: String,
            enum: ['SUSPECT', 'VICTIM', 'WITNESS', 'CONTACT']
        },
        notes: String
    }],
    ipAddresses: [{
        address: String,
        type: {
            type: String,
            enum: ['SUSPECT', 'VICTIM', 'SERVER', 'PROXY']
        },
        notes: String
    }],
    locations: [{
        cellID: String,
        latitude: Number,
        longitude: Number,
        address: String,
        significance: String
    }],

    // Evidence and Records
    ipdrRecords: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IPDR'
    }],
    suspiciousActivities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SuspiciousActivity'
    }],

    // Timeline
    events: [{
        timestamp: {
            type: Date,
            required: true
        },
        event: {
            type: String,
            required: true
        },
        description: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Important Dates
    startDate: {
        type: Date,
        default: Date.now
    },
    targetDate: Date,
    closedDate: Date,

    // Notes and Updates
    notes: [{
        content: {
            type: String,
            required: true
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        isConfidential: {
            type: Boolean,
            default: false
        }
    }],

    // Analytics
    statistics: {
        totalRecords: { type: Number, default: 0 },
        suspiciousRecords: { type: Number, default: 0 },
        uniqueNumbers: { type: Number, default: 0 },
        dateRange: {
            start: Date,
            end: Date
        },
        lastAnalysis: Date
    },

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

// Indexes
InvestigationSchema.index({ caseNumber: 1 });
InvestigationSchema.index({ status: 1, priority: 1 });
InvestigationSchema.index({ 'assignedTo.user': 1 });
InvestigationSchema.index({ createdAt: -1 });

// Virtual for case age in days
InvestigationSchema.virtual('ageInDays').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to add event
InvestigationSchema.methods.addEvent = function(event, description, userId) {
    this.events.push({
        timestamp: new Date(),
        event,
        description,
        addedBy: userId
    });

    return this.save();
};

// Method to add note
InvestigationSchema.methods.addNote = function(content, userId, isConfidential = false) {
    this.notes.push({
        content,
        addedBy: userId,
        isConfidential
    });

    return this.save();
};

// Method to update statistics
InvestigationSchema.methods.updateStatistics = async function() {
    const IPDR = mongoose.model('IPDR');

    const totalRecords = await IPDR.countDocuments({
        _id: { $in: this.ipdrRecords }
    });

    const suspiciousRecords = await IPDR.countDocuments({
        _id: { $in: this.ipdrRecords },
        suspicious: true
    });

    const uniqueNumbers = await IPDR.distinct('phoneNumber', {
        _id: { $in: this.ipdrRecords }
    });

    this.statistics = {
        totalRecords,
        suspiciousRecords,
        uniqueNumbers: uniqueNumbers.length,
        lastAnalysis: new Date()
    };

    return this.save();
};

module.exports = mongoose.model('Investigation', InvestigationSchema);
