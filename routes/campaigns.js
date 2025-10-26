const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, isAdmin, isAdminOrVolunteer } = require('../middleware/auth');

// Get all campaigns (public)
router.get('/', async (req, res) => {
    try {
        const { status, category, state } = req.query;
        let query = 'SELECT * FROM campaigns WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        if (state) {
            query += ' AND state = ?';
            params.push(state);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [campaigns] = await pool.query(query, params);
        res.json({ campaigns });
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

// Get single campaign by ID (public)
router.get('/:id', async (req, res) => {
    try {
        const [campaigns] = await pool.query(
            `SELECT c.*, u.name as creator_name 
             FROM campaigns c 
             LEFT JOIN users u ON c.created_by = u.user_id 
             WHERE c.campaign_id = ?`,
            [req.params.id]
        );
        
        if (campaigns.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        // Get donation statistics
        const [stats] = await pool.query(
            `SELECT COUNT(*) as total_donations, COUNT(DISTINCT donor_id) as unique_donors
             FROM donations 
             WHERE campaign_id = ? AND payment_status = 'completed'`,
            [req.params.id]
        );
        
        res.json({ 
            campaign: campaigns[0],
            stats: stats[0]
        });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
});

// Create new campaign (admin/volunteer only)
router.post('/', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const { 
            title, description, category, target_amount, 
            start_date, end_date, location, state, image_url 
        } = req.body;
        
        if (!title || !category || !target_amount || !start_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO campaigns (title, description, category, target_amount, start_date, 
             end_date, location, state, image_url, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category, target_amount, start_date, end_date, 
             location, state, image_url, req.user.userId]
        );
        
        res.status(201).json({ 
            message: 'Campaign created successfully',
            campaignId: result.insertId 
        });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

// Update campaign (admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { 
            title, description, category, target_amount, 
            start_date, end_date, location, state, image_url, status 
        } = req.body;
        
        const [result] = await pool.query(
            `UPDATE campaigns 
             SET title = ?, description = ?, category = ?, target_amount = ?, 
                 start_date = ?, end_date = ?, location = ?, state = ?, 
                 image_url = ?, status = ?
             WHERE campaign_id = ?`,
            [title, description, category, target_amount, start_date, end_date, 
             location, state, image_url, status, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        res.json({ message: 'Campaign updated successfully' });
    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
});

// Delete campaign (admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM campaigns WHERE campaign_id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ error: 'Failed to delete campaign' });
    }
});

// Get campaign summary/statistics
router.get('/:id/summary', async (req, res) => {
    try {
        const [summary] = await pool.query(
            'SELECT * FROM campaign_summary WHERE campaign_id = ?',
            [req.params.id]
        );
        
        if (summary.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        res.json({ summary: summary[0] });
    } catch (error) {
        console.error('Get campaign summary error:', error);
        res.status(500).json({ error: 'Failed to fetch campaign summary' });
    }
});

module.exports = router;
