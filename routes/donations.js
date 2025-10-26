const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, isAdmin, isAdminOrVolunteer } = require('../middleware/auth');

// Get all donations (admin/volunteer only)
router.get('/', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const { campaign_id, donor_id, status } = req.query;
        let query = `
            SELECT d.*, u.name as donor_name, u.email as donor_email, 
                   c.title as campaign_title
            FROM donations d
            LEFT JOIN users u ON d.donor_id = u.user_id
            LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
            WHERE 1=1
        `;
        const params = [];
        
        if (campaign_id) {
            query += ' AND d.campaign_id = ?';
            params.push(campaign_id);
        }
        if (donor_id) {
            query += ' AND d.donor_id = ?';
            params.push(donor_id);
        }
        if (status) {
            query += ' AND d.payment_status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY d.donation_date DESC';
        
        const [donations] = await pool.query(query, params);
        res.json({ donations });
    } catch (error) {
        console.error('Get donations error:', error);
        res.status(500).json({ error: 'Failed to fetch donations' });
    }
});

// Get user's own donations
router.get('/my-donations', verifyToken, async (req, res) => {
    try {
        const [donations] = await pool.query(
            `SELECT d.*, c.title as campaign_title, c.category
             FROM donations d
             LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
             WHERE d.donor_id = ?
             ORDER BY d.donation_date DESC`,
            [req.user.userId]
        );
        
        res.json({ donations });
    } catch (error) {
        console.error('Get my donations error:', error);
        res.status(500).json({ error: 'Failed to fetch donations' });
    }
});

// Create new donation
router.post('/', verifyToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { 
            campaign_id, amount, payment_method, transaction_id, 
            anonymous, message 
        } = req.body;
        
        if (!campaign_id || !amount || !payment_method) {
            await connection.rollback();
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Generate receipt number
        const receiptNumber = 'RCT' + Date.now() + Math.floor(Math.random() * 1000);
        
        // Insert donation
        const [donationResult] = await connection.query(
            `INSERT INTO donations (donor_id, campaign_id, amount, payment_method, 
             transaction_id, payment_status, receipt_number, anonymous, message, tax_benefit) 
             VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, TRUE)`,
            [req.user.userId, campaign_id, amount, payment_method, transaction_id, 
             receiptNumber, anonymous || false, message]
        );
        
        // Update campaign raised amount
        await connection.query(
            'UPDATE campaigns SET raised_amount = raised_amount + ? WHERE campaign_id = ?',
            [amount, campaign_id]
        );
        
        // Create tax receipt
        const currentYear = new Date().getFullYear();
        const financialYear = `${currentYear}-${currentYear + 1}`;
        
        await connection.query(
            `INSERT INTO tax_receipts (donation_id, receipt_number, financial_year, issued_date)
             VALUES (?, ?, ?, CURDATE())`,
            [donationResult.insertId, receiptNumber, financialYear]
        );
        
        await connection.commit();
        
        res.status(201).json({ 
            message: 'Donation successful',
            donationId: donationResult.insertId,
            receiptNumber
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create donation error:', error);
        res.status(500).json({ error: 'Failed to process donation' });
    } finally {
        connection.release();
    }
});

// Get donation by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [donations] = await pool.query(
            `SELECT d.*, u.name as donor_name, u.email as donor_email, u.phone as donor_phone,
                    c.title as campaign_title, c.category,
                    tr.receipt_number as tax_receipt_number, tr.financial_year
             FROM donations d
             LEFT JOIN users u ON d.donor_id = u.user_id
             LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
             LEFT JOIN tax_receipts tr ON d.donation_id = tr.donation_id
             WHERE d.donation_id = ?`,
            [req.params.id]
        );
        
        if (donations.length === 0) {
            return res.status(404).json({ error: 'Donation not found' });
        }
        
        const donation = donations[0];
        
        // Check if user has access (own donation or admin/volunteer)
        if (req.user.role !== 'admin' && req.user.role !== 'volunteer' && 
            donation.donor_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        res.json({ donation });
    } catch (error) {
        console.error('Get donation error:', error);
        res.status(500).json({ error: 'Failed to fetch donation' });
    }
});

// Update donation status (admin only)
router.put('/:id/status', verifyToken, isAdmin, async (req, res) => {
    try {
        const { payment_status } = req.body;
        
        if (!payment_status) {
            return res.status(400).json({ error: 'Payment status is required' });
        }
        
        const [result] = await pool.query(
            'UPDATE donations SET payment_status = ? WHERE donation_id = ?',
            [payment_status, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Donation not found' });
        }
        
        res.json({ message: 'Donation status updated successfully' });
    } catch (error) {
        console.error('Update donation status error:', error);
        res.status(500).json({ error: 'Failed to update donation status' });
    }
});

// Get donation statistics
router.get('/stats/summary', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const [totalStats] = await pool.query(
            `SELECT 
                COUNT(*) as total_donations,
                SUM(amount) as total_amount,
                AVG(amount) as average_amount,
                COUNT(DISTINCT donor_id) as unique_donors
             FROM donations 
             WHERE payment_status = 'completed'`
        );
        
        const [methodStats] = await pool.query(
            `SELECT payment_method, COUNT(*) as count, SUM(amount) as total
             FROM donations 
             WHERE payment_status = 'completed'
             GROUP BY payment_method`
        );
        
        const [monthlyStats] = await pool.query(
            `SELECT 
                DATE_FORMAT(donation_date, '%Y-%m') as month,
                COUNT(*) as donations,
                SUM(amount) as amount
             FROM donations 
             WHERE payment_status = 'completed' 
                AND donation_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
             GROUP BY DATE_FORMAT(donation_date, '%Y-%m')
             ORDER BY month DESC`
        );
        
        res.json({
            total: totalStats[0],
            byMethod: methodStats,
            monthly: monthlyStats
        });
    } catch (error) {
        console.error('Get donation stats error:', error);
        res.status(500).json({ error: 'Failed to fetch donation statistics' });
    }
});

module.exports = router;
