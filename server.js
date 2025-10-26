const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const donationRoutes = require('./routes/donations');
const beneficiaryRoutes = require('./routes/beneficiaries');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/reports', reportRoutes);

// Root route - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Charity Management System API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('⚠ Warning: Database connection failed. Please check your MySQL configuration.');
            console.error('⚠ Make sure MySQL is running and database credentials in .env are correct.');
        }
        
        app.listen(PORT, () => {
            console.log('\n===========================================');
            console.log('🎉 Charity Management System Started');
            console.log('===========================================');
            console.log(`📡 Server: http://localhost:${PORT}`);
            console.log(`🗄️  Database: ${process.env.DB_NAME}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('===========================================\n');
            console.log('Available API Endpoints:');
            console.log('  POST   /api/auth/register');
            console.log('  POST   /api/auth/login');
            console.log('  GET    /api/campaigns');
            console.log('  GET    /api/campaigns/:id');
            console.log('  POST   /api/campaigns (admin/volunteer)');
            console.log('  GET    /api/donations (admin/volunteer)');
            console.log('  POST   /api/donations (authenticated)');
            console.log('  GET    /api/beneficiaries (admin/volunteer)');
            console.log('  POST   /api/beneficiaries (admin/volunteer)');
            console.log('  GET    /api/reports/dashboard (admin/volunteer)');
            console.log('===========================================\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

startServer();

module.exports = app;
