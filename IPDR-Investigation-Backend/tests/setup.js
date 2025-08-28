const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
});

// Cleanup after each test
afterEach(async () => {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

// Cleanup after all tests
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

// Global test utilities
global.createTestUser = async (userData = {}) => {
    const User = require('../models/user.model');
    
    const defaultUser = {
        badgeNumber: 'TEST001',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: 'ANALYST',
        department: 'CYBERCRIME',
        clearanceLevel: 2
    };
    
    const user = new User({ ...defaultUser, ...userData });
    return await user.save();
};

global.createTestIPDR = async (ipdrData = {}) => {
    const IPDR = require('../models/ipdr.model');
    
    const defaultIPDR = {
        privateIP: '192.168.1.100',
        privatePort: 12345,
        publicIP: '203.0.113.1',
        publicPort: 80,
        destIP: '198.51.100.1',
        destPort: 443,
        phoneNumber: '9876543210',
        imei: '123456789012345',
        imsi: '123456789012345',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        originCellID: 'TEST-CELL-001',
        originLat: 28.6139,
        originLong: 77.2090,
        uplinkVolume: 1024,
        downlinkVolume: 2048,
        accessType: '4G'
    };
    
    const ipdr = new IPDR({ ...defaultIPDR, ...ipdrData });
    return await ipdr.save();
};
