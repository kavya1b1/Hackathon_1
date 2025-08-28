const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;


const ipdrRoutes = require('./routes_backup/ipdr.routes');
app.use('/api/ipdr', ipdrRoutes); // will match /api/ipdr/upload

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'IPDR Investigation System API',
        version: '1.0.0',
        status: 'Active',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            test: '/api/test',
            status: 'Other endpoints will be added as we build the system'
        }
    });
});

// Basic API test endpoints
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working perfectly!',
        timestamp: new Date().toISOString(),
        server: 'IPDR Investigation Backend'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`,
        availableEndpoints: ['/', '/health', '/api/test']
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('🚀 IPDR Investigation System Backend Started!');
    console.log('==================================================');
    console.log(`📍 Server running on port: ${PORT}`);
    console.log(`🌐 API URL: http://localhost:${PORT}`);
    console.log(`🎯 Health Check: http://localhost:${PORT}/health`);
    console.log(`📊 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('==================================================');
    console.log('✅ Ready to accept requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

module.exports = app;
