const mongoose = require('mongoose');
const logger = require('../utils/logger');

class DatabaseConfig {
    static async connect() {
        try {
            const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ipdr_investigation';

            // Connection options
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                bufferCommands: false, // Disable mongoose buffering
                bufferMaxEntries: 0, // Disable mongoose buffering
                autoIndex: process.env.NODE_ENV !== 'production' // Build indexes in development
            };

            // Connect to MongoDB
            await mongoose.connect(mongoURI, options);

            logger.info('MongoDB connected successfully');
            logger.info(`Database: ${mongoose.connection.name}`);
            logger.info(`Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

            // Connection event listeners
            mongoose.connection.on('connected', () => {
                logger.info('Mongoose connected to MongoDB');
            });

            mongoose.connection.on('error', (err) => {
                logger.error('Mongoose connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('Mongoose disconnected from MongoDB');
            });

            // If the Node process ends, close the Mongoose connection
            process.on('SIGINT', async () => {
                await mongoose.connection.close();
                logger.info('Mongoose connection closed through app termination');
                process.exit(0);
            });

        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    // Get database statistics
    static async getStats() {
        try {
            const stats = await mongoose.connection.db.stats();
            return {
                database: mongoose.connection.name,
                collections: stats.collections,
                objects: stats.objects,
                dataSize: stats.dataSize,
                storageSize: stats.storageSize,
                indexes: stats.indexes,
                indexSize: stats.indexSize
            };
        } catch (error) {
            logger.error('Error getting database stats:', error);
            throw error;
        }
    }

    // Create indexes for better performance
    static async createIndexes() {
        try {
            const IPDR = require('../models/ipdr.model');
            const User = require('../models/user.model');
            const Investigation = require('../models/investigation.model');
            const SuspiciousActivity = require('../models/suspicious.model');

            logger.info('Creating database indexes...');

            // IPDR indexes
            await IPDR.createIndexes();

            // User indexes
            await User.createIndexes();

            // Investigation indexes
            await Investigation.createIndexes();

            // SuspiciousActivity indexes
            await SuspiciousActivity.createIndexes();

            logger.info('Database indexes created successfully');
        } catch (error) {
            logger.error('Error creating indexes:', error);
            throw error;
        }
    }

    // Seed initial data
    static async seedData() {
        try {
            const User = require('../models/user.model');

            // Check if admin user exists
            const adminExists = await User.findOne({ role: 'ADMIN' });

            if (!adminExists) {
                logger.info('Creating default admin user...');

                const adminUser = new User({
                    badgeNumber: 'ADMIN001',
                    firstName: 'System',
                    lastName: 'Administrator',
                    email: 'admin@ipdr-system.gov',
                    password: 'Admin@123456', // Change this in production
                    role: 'ADMIN',
                    department: 'GENERAL',
                    clearanceLevel: 5
                });

                await adminUser.save();
                logger.info('Default admin user created');
                logger.info('Email: admin@ipdr-system.gov');
                logger.info('Password: Admin@123456 (CHANGE THIS IN PRODUCTION)');
            }

            // Create sample detective user
            const detectiveExists = await User.findOne({ badgeNumber: 'DET001' });

            if (!detectiveExists) {
                const detectiveUser = new User({
                    badgeNumber: 'DET001',
                    firstName: 'John',
                    lastName: 'Smith',
                    email: 'detective.smith@ipdr-system.gov',
                    password: 'Detective@123',
                    role: 'DETECTIVE',
                    department: 'CYBERCRIME',
                    clearanceLevel: 3
                });

                await detectiveUser.save();
                logger.info('Sample detective user created');
            }

            // Create sample analyst user
            const analystExists = await User.findOne({ badgeNumber: 'ANA001' });

            if (!analystExists) {
                const analystUser = new User({
                    badgeNumber: 'ANA001',
                    firstName: 'Jane',
                    lastName: 'Doe',
                    email: 'analyst.doe@ipdr-system.gov',
                    password: 'Analyst@123',
                    role: 'ANALYST',
                    department: 'CYBERCRIME',
                    clearanceLevel: 2
                });

                await analystUser.save();
                logger.info('Sample analyst user created');
            }

        } catch (error) {
            logger.error('Error seeding data:', error);
            throw error;
        }
    }

    // Clean up old data
    static async cleanup() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const SuspiciousActivity = require('../models/suspicious.model');

            // Clean up resolved suspicious activities older than 30 days
            const cleanupResult = await SuspiciousActivity.deleteMany({
                status: 'RESOLVED',
                resolvedAt: { $lt: thirtyDaysAgo }
            });

            logger.info(`Cleaned up ${cleanupResult.deletedCount} old suspicious activity records`);

        } catch (error) {
            logger.error('Error during cleanup:', error);
            throw error;
        }
    }
}

module.exports = DatabaseConfig;
