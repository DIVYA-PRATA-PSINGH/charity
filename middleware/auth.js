const jwt = require('jsonwebtoken');

// Verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }
    
    try {
        const jwtSecret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_for_charity_management_system_2025';
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Check if user is admin or volunteer
const isAdminOrVolunteer = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'volunteer') {
        return res.status(403).json({ error: 'Admin or volunteer access required' });
    }
    next();
};

module.exports = {
    verifyToken,
    isAdmin,
    isAdminOrVolunteer
};
