const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, isAdmin, isAdminOrVolunteer } = require('../middleware/auth');

// Get all beneficiaries (admin/volunteer only)
router.get('/', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const { status, category, state, income_level } = req.query;
        let query = `
            SELECT b.*, u.name as registered_by_name
            FROM beneficiaries b
            LEFT JOIN users u ON b.registered_by = u.user_id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }
        if (category) {
            query += ' AND b.category = ?';
            params.push(category);
        }
        if (state) {
            query += ' AND b.state = ?';
            params.push(state);
        }
        if (income_level) {
            query += ' AND b.income_level = ?';
            params.push(income_level);
        }
        
        query += ' ORDER BY b.registered_at DESC';
        
        const [beneficiaries] = await pool.query(query, params);
        res.json({ beneficiaries });
    } catch (error) {
        console.error('Get beneficiaries error:', error);
        res.status(500).json({ error: 'Failed to fetch beneficiaries' });
    }
});

// Get single beneficiary by ID
router.get('/:id', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const [beneficiaries] = await pool.query(
            `SELECT b.*, u.name as registered_by_name, u.email as registered_by_email
             FROM beneficiaries b
             LEFT JOIN users u ON b.registered_by = u.user_id
             WHERE b.beneficiary_id = ?`,
            [req.params.id]
        );
        
        if (beneficiaries.length === 0) {
            return res.status(404).json({ error: 'Beneficiary not found' });
        }
        
        // Get aid distribution history
        const [aidHistory] = await pool.query(
            `SELECT ad.*, c.title as campaign_title, u.name as distributed_by_name
             FROM aid_distribution ad
             LEFT JOIN campaigns c ON ad.campaign_id = c.campaign_id
             LEFT JOIN users u ON ad.distributed_by = u.user_id
             WHERE ad.beneficiary_id = ?
             ORDER BY ad.distribution_date DESC`,
            [req.params.id]
        );
        
        res.json({ 
            beneficiary: beneficiaries[0],
            aidHistory
        });
    } catch (error) {
        console.error('Get beneficiary error:', error);
        res.status(500).json({ error: 'Failed to fetch beneficiary' });
    }
});

// Register new beneficiary
router.post('/', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const {
            name, age, gender, aadhaar_number, phone, email,
            address, city, state, pincode, category, income_level,
            family_members, description
        } = req.body;
        
        if (!name || !category) {
            return res.status(400).json({ error: 'Name and category are required' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO beneficiaries (name, age, gender, aadhaar_number, phone, email,
             address, city, state, pincode, category, income_level, family_members,
             description, registered_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, age, gender, aadhaar_number, phone, email, address, city, state,
             pincode, category, income_level, family_members, description, req.user.userId]
        );
        
        res.status(201).json({
            message: 'Beneficiary registered successfully',
            beneficiaryId: result.insertId
        });
    } catch (error) {
        console.error('Register beneficiary error:', error);
        res.status(500).json({ error: 'Failed to register beneficiary' });
    }
});

// Update beneficiary
router.put('/:id', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const {
            name, age, gender, aadhaar_number, phone, email,
            address, city, state, pincode, category, income_level,
            family_members, description, status
        } = req.body;
        
        const [result] = await pool.query(
            `UPDATE beneficiaries 
             SET name = ?, age = ?, gender = ?, aadhaar_number = ?, phone = ?, email = ?,
                 address = ?, city = ?, state = ?, pincode = ?, category = ?,
                 income_level = ?, family_members = ?, description = ?, status = ?
             WHERE beneficiary_id = ?`,
            [name, age, gender, aadhaar_number, phone, email, address, city, state,
             pincode, category, income_level, family_members, description, status, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Beneficiary not found' });
        }
        
        res.json({ message: 'Beneficiary updated successfully' });
    } catch (error) {
        console.error('Update beneficiary error:', error);
        res.status(500).json({ error: 'Failed to update beneficiary' });
    }
});

// Delete beneficiary
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM beneficiaries WHERE beneficiary_id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Beneficiary not found' });
        }
        
        res.json({ message: 'Beneficiary deleted successfully' });
    } catch (error) {
        console.error('Delete beneficiary error:', error);
        res.status(500).json({ error: 'Failed to delete beneficiary' });
    }
});

// Add aid distribution record
router.post('/:id/aid', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const {
            campaign_id, aid_type, amount, description,
            quantity, distribution_date, remarks
        } = req.body;
        
        if (!aid_type || !distribution_date) {
            return res.status(400).json({ error: 'Aid type and distribution date are required' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO aid_distribution (beneficiary_id, campaign_id, aid_type, amount,
             description, quantity, distribution_date, distributed_by, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, campaign_id, aid_type, amount, description, quantity,
             distribution_date, req.user.userId, remarks]
        );
        
        res.status(201).json({
            message: 'Aid distribution recorded successfully',
            distributionId: result.insertId
        });
    } catch (error) {
        console.error('Add aid distribution error:', error);
        res.status(500).json({ error: 'Failed to record aid distribution' });
    }
});

// Get beneficiary statistics
router.get('/stats/summary', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const [totalStats] = await pool.query(
            `SELECT 
                COUNT(*) as total_beneficiaries,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_beneficiaries,
                COUNT(CASE WHEN income_level = 'BPL' THEN 1 END) as bpl_count
             FROM beneficiaries`
        );
        
        const [categoryStats] = await pool.query(
            `SELECT category, COUNT(*) as count
             FROM beneficiaries
             WHERE status = 'active'
             GROUP BY category`
        );
        
        const [stateStats] = await pool.query(
            `SELECT state, COUNT(*) as count
             FROM beneficiaries
             WHERE status = 'active' AND state IS NOT NULL
             GROUP BY state
             ORDER BY count DESC
             LIMIT 10`
        );
        
        res.json({
            total: totalStats[0],
            byCategory: categoryStats,
            byState: stateStats
        });
    } catch (error) {
        console.error('Get beneficiary stats error:', error);
        res.status(500).json({ error: 'Failed to fetch beneficiary statistics' });
    }
});

module.exports = router;
