// Application constants and configuration

module.exports = {
    // User roles
    USER_ROLES: {
        DETECTIVE: 'DETECTIVE',
        ANALYST: 'ANALYST', 
        SUPERVISOR: 'SUPERVISOR',
        ADMIN: 'ADMIN'
    },

    // Departments
    DEPARTMENTS: {
        CYBERCRIME: 'CYBERCRIME',
        NARCOTICS: 'NARCOTICS',
        TERRORISM: 'TERRORISM',
        FINANCIAL: 'FINANCIAL',
        GENERAL: 'GENERAL'
    },

    // Access types
    ACCESS_TYPES: {
        '2G': '2G',
        '3G': '3G',
        '4G': '4G',
        '5G': '5G'
    },

    // Investigation statuses
    INVESTIGATION_STATUS: {
        OPEN: 'OPEN',
        ACTIVE: 'ACTIVE',
        PENDING: 'PENDING',
        CLOSED: 'CLOSED',
        SUSPENDED: 'SUSPENDED'
    },

    // Investigation priorities
    INVESTIGATION_PRIORITY: {
        LOW: 'LOW',
        MEDIUM: 'MEDIUM',
        HIGH: 'HIGH',
        CRITICAL: 'CRITICAL'
    },

    // Suspicious activity types
    SUSPICIOUS_TYPES: {
        HIGH_NIGHT_ACTIVITY: 'HIGH_NIGHT_ACTIVITY',
        UNUSUAL_DATA_VOLUME: 'UNUSUAL_DATA_VOLUME',
        MULTIPLE_DEVICES: 'MULTIPLE_DEVICES',
        LOCATION_ANOMALY: 'LOCATION_ANOMALY',
        SHORT_DURATION_FREQUENT: 'SHORT_DURATION_FREQUENT',
        FOREIGN_IP_COMMUNICATION: 'FOREIGN_IP_COMMUNICATION',
        BURST_COMMUNICATION: 'BURST_COMMUNICATION',
        PATTERN_DEVIATION: 'PATTERN_DEVIATION',
        ENCRYPTION_DETECTED: 'ENCRYPTION_DETECTED'
    },

    // Severity levels
    SEVERITY_LEVELS: {
        LOW: 'LOW',
        MEDIUM: 'MEDIUM',
        HIGH: 'HIGH',
        CRITICAL: 'CRITICAL'
    },

    // Activity statuses
    ACTIVITY_STATUS: {
        NEW: 'NEW',
        FLAGGED: 'FLAGGED',
        UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
        RESOLVED: 'RESOLVED',
        FALSE_POSITIVE: 'FALSE_POSITIVE'
    },

    // Classification levels
    CLASSIFICATION_LEVELS: {
        UNCLASSIFIED: 'UNCLASSIFIED',
        CONFIDENTIAL: 'CONFIDENTIAL',
        SECRET: 'SECRET',
        TOP_SECRET: 'TOP_SECRET'
    },

    // Default pagination
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 50,
        MAX_LIMIT: 1000
    },

    // File upload limits
    FILE_LIMITS: {
        MAX_SIZE: 100 * 1024 * 1024, // 100MB
        ALLOWED_TYPES: ['.csv', '.json', '.txt'],
        UPLOAD_DIR: 'uploads/'
    },

    // Search limits
    SEARCH_LIMITS: {
        MAX_RESULTS: 10000,
        SUGGESTION_LIMIT: 10,
        RELATIONSHIP_DEPTH: 3
    },

    // Time periods
    TIME_PERIODS: {
        NIGHT_START: 22,
        NIGHT_END: 6,
        ANALYSIS_WINDOW: 3600000, // 1 hour in milliseconds
        SESSION_TIMEOUT: 28800000 // 8 hours in milliseconds
    },

    // Data thresholds
    THRESHOLDS: {
        SUSPICIOUS_DATA_VOLUME: 10485760, // 10MB
        SHORT_DURATION: 30000, // 30 seconds
        HIGH_FREQUENCY: 10, // calls per hour
        UNUSUAL_LOCATION_DISTANCE: 100, // kilometers
        CONFIDENCE_THRESHOLD: 0.7
    },

    // Geographic defaults
    GEOGRAPHY: {
        DEFAULT_LAT: 28.6139, // Delhi
        DEFAULT_LNG: 77.2090,
        EARTH_RADIUS: 6371 // kilometers
    },

    // Rate limiting
    RATE_LIMITS: {
        LOGIN_ATTEMPTS: 5,
        SEARCH_REQUESTS: 100,
        UPLOAD_REQUESTS: 10,
        TIME_WINDOW: 900000 // 15 minutes
    },

    // Export formats
    EXPORT_FORMATS: {
        CSV: 'csv',
        JSON: 'json',
        PDF: 'pdf'
    },

    // HTTP status codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        LOCKED: 423,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_ERROR: 500
    },

    // Regular expressions
    REGEX: {
        PHONE_NUMBER: /^[0-9]{10,15}$/,
        IP_ADDRESS: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/,
        IMEI: /^[0-9]{15}$/,
        IMSI: /^[0-9]{15}$/,
        BADGE_NUMBER: /^[A-Z0-9]{4,10}$/,
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        CASE_NUMBER: /^[A-Z]{2,4}-[0-9]{4}-[0-9]{6}$/
    },

    // API versions
    API_VERSION: 'v1',

    // Application metadata
    APP_INFO: {
        NAME: 'IPDR Investigation System',
        VERSION: '1.0.0',
        DESCRIPTION: 'Advanced IPDR Analysis and Investigation Platform',
        AUTHOR: 'Law Enforcement Technology Division'
    }
};
