const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // Personal Information
    badgeNumber: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[A-Z0-9]{4,10}$/.test(v);
            },
            message: 'Badge number must be 4-10 alphanumeric characters'
        }
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },

    // Authentication
    password: {
        type: String,
        required: true,
        minlength: 8
    },

    // Authorization
    role: {
        type: String,
        required: true,
        enum: ['DETECTIVE', 'ANALYST', 'SUPERVISOR', 'ADMIN'],
        default: 'ANALYST'
    },
    department: {
        type: String,
        required: true,
        enum: ['CYBERCRIME', 'NARCOTICS', 'TERRORISM', 'FINANCIAL', 'GENERAL']
    },
    clearanceLevel: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        default: 2
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,

    // Preferences
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'dark'
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        notifications: {
            email: { type: Boolean, default: true },
            realtime: { type: Boolean, default: true },
            suspicious: { type: Boolean, default: true }
        }
    },

    // Activity Tracking
    investigationsAssigned: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Investigation'
    }],
    lastActivity: {
        type: Date,
        default: Date.now
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
UserSchema.index({ badgeNumber: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, department: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Password hashing middleware
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Password comparison method
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
UserSchema.methods.incrementLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // If we're at max attempts and not locked, lock the account
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }

    return this.updateOne(updates);
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

module.exports = mongoose.model('User', UserSchema);
