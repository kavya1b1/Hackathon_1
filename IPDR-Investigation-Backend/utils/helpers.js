const crypto = require('crypto');
const moment = require('moment');

class Helpers {
    // Generate unique ID
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        return `${prefix}${timestamp}${random}`.toUpperCase();
    }

    // Format phone number
    static formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return '';
        const cleaned = phoneNumber.replace(/\D/g, '');

        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        }

        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');
        }

        return phoneNumber;
    }

    // Validate IP address
    static isValidIP(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(ip);
    }

    // Format data size
    static formatDataSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Format duration
    static formatDuration(milliseconds) {
        const duration = moment.duration(milliseconds);

        if (duration.asHours() >= 1) {
            return `${Math.floor(duration.asHours())}h ${duration.minutes()}m ${duration.seconds()}s`;
        }

        if (duration.asMinutes() >= 1) {
            return `${duration.minutes()}m ${duration.seconds()}s`;
        }

        return `${duration.seconds()}s`;
    }

    // Calculate distance between two coordinates
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    // Convert degrees to radians
    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Sanitize filename
    static sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
    }

    // Generate case number
    static generateCaseNumber(department = 'GEN') {
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        return `${department.substring(0, 3).toUpperCase()}-${year}-${timestamp}`;
    }

    // Check if time is during night hours
    static isNightTime(date) {
        const hour = new Date(date).getHours();
        return hour >= 22 || hour <= 6;
    }

    // Get time period label
    static getTimePeriod(date) {
        const hour = new Date(date).getHours();

        if (hour >= 6 && hour < 12) return 'Morning';
        if (hour >= 12 && hour < 17) return 'Afternoon';
        if (hour >= 17 && hour < 22) return 'Evening';
        return 'Night';
    }

    // Paginate array
    static paginate(array, page = 1, limit = 10) {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        return {
            data: array.slice(startIndex, endIndex),
            pagination: {
                current: page,
                pages: Math.ceil(array.length / limit),
                total: array.length,
                limit,
                hasNext: endIndex < array.length,
                hasPrev: startIndex > 0
            }
        };
    }

    // Deep clone object
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Remove sensitive data from object
    static sanitizeObject(obj, sensitiveFields = ['password', 'token', 'secret']) {
        const sanitized = this.deepClone(obj);

        const removeSensitive = (object) => {
            Object.keys(object).forEach(key => {
                if (sensitiveFields.includes(key.toLowerCase())) {
                    delete object[key];
                } else if (typeof object[key] === 'object' && object[key] !== null) {
                    removeSensitive(object[key]);
                }
            });
        };

        removeSensitive(sanitized);
        return sanitized;
    }
}

module.exports = Helpers;
