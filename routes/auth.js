const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role, pan_number, address, city, state, pincode } = req.body;
        
        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        
        // Check if user already exists
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, role, pan_number, address, city, state, pincode) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, phone, hashedPassword, role || 'donor', pan_number, address, city, state, pincode]
        );
        
        res.status(201).json({ 
            message: 'User registered successfully',
            userId: result.insertId 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Get user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND status = "active"', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_for_charity_management_system_2025';
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            jwtSecret,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                city: user.city,
                state: user.state
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
