const mongoose = require('mongoose');
const DatabaseConfig = require('../config/database');
const User = require('../models/user.model');
const logger = require('../utils/logger');

async function seedDatabase() {
    try {
        logger.info('🌱 Starting database seeding...');
        
        await DatabaseConfig.connect();
        await DatabaseConfig.createIndexes();
        
        const adminExists = await User.findOne({ role: 'ADMIN' });
        
        if (!adminExists) {
            const adminUser = new User({
                badgeNumber: 'ADMIN001',
                firstName: 'System',
                lastName: 'Administrator',
                email: 'admin@ipdr-system.gov',
                password: 'Admin@123456',
                role: 'ADMIN',
                department: 'GENERAL',
                clearanceLevel: 5
            });
            
            await adminUser.save();
            logger.info('✅ Default admin user created');
        }
        
        // Create detective and analyst users similarly...
        
        logger.info('🎉 Database seeding completed!');
        process.exit(0);
        
    } catch (error) {
        logger.error('❌ Database seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();
