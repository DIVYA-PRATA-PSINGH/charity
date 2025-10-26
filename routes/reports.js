const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, isAdminOrVolunteer } = require('../middleware/auth');

// Dashboard summary
router.get('/dashboard', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        // Overall statistics
        const [overallStats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM campaigns WHERE status = 'active') as active_campaigns,
                (SELECT COUNT(*) FROM users WHERE role = 'donor' AND status = 'active') as total_donors,
                (SELECT COUNT(*) FROM beneficiaries WHERE status = 'active') as active_beneficiaries,
                (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE payment_status = 'completed') as total_donations_amount
        `);
        
        // Recent donations
        const [recentDonations] = await pool.query(`
            SELECT d.donation_id, d.amount, d.donation_date, d.anonymous,
                   u.name as donor_name, c.title as campaign_title
            FROM donations d
            LEFT JOIN users u ON d.donor_id = u.user_id
            LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
            WHERE d.payment_status = 'completed'
            ORDER BY d.donation_date DESC
            LIMIT 10
        `);
        
        // Top campaigns
        const [topCampaigns] = await pool.query(`
            SELECT campaign_id, title, category, target_amount, raised_amount,
                   (raised_amount / target_amount * 100) as completion_percentage
            FROM campaigns
            WHERE status = 'active'
            ORDER BY raised_amount DESC
            LIMIT 5
        `);
        
        res.json({
            stats: overallStats[0],
            recentDonations,
            topCampaigns
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Financial report
router.get('/financial', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const { start_date, end_date, campaign_id } = req.query;
        
        let dateFilter = '';
        let params = [];
        
        if (start_date && end_date) {
            dateFilter = 'AND d.donation_date BETWEEN ? AND ?';
            params = [start_date, end_date];
        }
        
        // Income (donations)
        let incomeQuery = `
            SELECT 
                c.title as campaign_title,
                COUNT(d.donation_id) as donation_count,
                SUM(d.amount) as total_amount,
                AVG(d.amount) as average_amount
            FROM donations d
            LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
            WHERE d.payment_status = 'completed' ${dateFilter}
        `;
        
        if (campaign_id) {
            incomeQuery += ' AND d.campaign_id = ?';
            params.push(campaign_id);
        }
        
        incomeQuery += ' GROUP BY c.campaign_id, c.title ORDER BY total_amount DESC';
        
        const [incomeData] = await pool.query(incomeQuery, params);
        
        // Expenses
        let expenseQuery = `
            SELECT 
                e.category,
                COUNT(e.expense_id) as expense_count,
                SUM(e.amount) as total_amount
            FROM expenses e
            WHERE e.status = 'approved' ${dateFilter.replace('d.donation_date', 'e.expense_date')}
        `;
        
        const expenseParams = start_date && end_date ? [start_date, end_date] : [];
        
        if (campaign_id) {
            expenseQuery += ' AND e.campaign_id = ?';
            expenseParams.push(campaign_id);
        }
        
        expenseQuery += ' GROUP BY e.category';
        
        const [expenseData] = await pool.query(expenseQuery, expenseParams);
        
        // Calculate totals
        const totalIncome = incomeData.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
        const totalExpense = expenseData.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
        
        res.json({
            income: {
                byCampaign: incomeData,
                total: totalIncome
            },
            expenses: {
                byCategory: expenseData,
                total: totalExpense
            },
            netBalance: totalIncome - totalExpense
        });
    } catch (error) {
        console.error('Financial report error:', error);
        res.status(500).json({ error: 'Failed to generate financial report' });
    }
});

// Donor report
router.get('/donors', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const [topDonors] = await pool.query(`
            SELECT * FROM donor_summary
            ORDER BY total_donated DESC
            LIMIT 20
        `);
        
        const [donorsByState] = await pool.query(`
            SELECT u.state, COUNT(DISTINCT u.user_id) as donor_count, 
                   COALESCE(SUM(d.amount), 0) as total_amount
            FROM users u
            LEFT JOIN donations d ON u.user_id = d.donor_id AND d.payment_status = 'completed'
            WHERE u.role = 'donor' AND u.state IS NOT NULL
            GROUP BY u.state
            ORDER BY total_amount DESC
        `);
        
        const [newDonorsMonthly] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as new_donors
            FROM users
            WHERE role = 'donor' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
        `);
        
        res.json({
            topDonors,
            donorsByState,
            newDonorsMonthly
        });
    } catch (error) {
        console.error('Donor report error:', error);
        res.status(500).json({ error: 'Failed to generate donor report' });
    }
});

// Campaign performance report
router.get('/campaign-performance', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const [campaignPerformance] = await pool.query(`
            SELECT * FROM campaign_summary
            ORDER BY completion_percentage DESC
        `);
        
        const [categoryPerformance] = await pool.query(`
            SELECT 
                c.category,
                COUNT(c.campaign_id) as campaign_count,
                SUM(c.target_amount) as total_target,
                SUM(c.raised_amount) as total_raised,
                (SUM(c.raised_amount) / SUM(c.target_amount) * 100) as avg_completion
            FROM campaigns c
            GROUP BY c.category
        `);
        
        res.json({
            campaigns: campaignPerformance,
            byCategory: categoryPerformance
        });
    } catch (error) {
        console.error('Campaign performance error:', error);
        res.status(500).json({ error: 'Failed to generate campaign performance report' });
    }
});

// Beneficiary report
router.get('/beneficiaries', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const [beneficiaryStats] = await pool.query(`
            SELECT 
                category,
                COUNT(*) as total_count,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
            FROM beneficiaries
            GROUP BY category
        `);
        
        const [aidDistribution] = await pool.query(`
            SELECT 
                ad.aid_type,
                COUNT(*) as distribution_count,
                COALESCE(SUM(ad.amount), 0) as total_amount,
                COUNT(DISTINCT ad.beneficiary_id) as unique_beneficiaries
            FROM aid_distribution ad
            GROUP BY ad.aid_type
        `);
        
        const [stateWiseDistribution] = await pool.query(`
            SELECT 
                b.state,
                COUNT(DISTINCT b.beneficiary_id) as beneficiary_count,
                COUNT(ad.distribution_id) as aid_distributions,
                COALESCE(SUM(ad.amount), 0) as total_aid_amount
            FROM beneficiaries b
            LEFT JOIN aid_distribution ad ON b.beneficiary_id = ad.beneficiary_id
            WHERE b.state IS NOT NULL
            GROUP BY b.state
            ORDER BY beneficiary_count DESC
        `);
        
        res.json({
            byCategory: beneficiaryStats,
            aidDistribution,
            stateWise: stateWiseDistribution
        });
    } catch (error) {
        console.error('Beneficiary report error:', error);
        res.status(500).json({ error: 'Failed to generate beneficiary report' });
    }
});

// Tax receipt report (for 80G compliance)
router.get('/tax-receipts', verifyToken, isAdminOrVolunteer, async (req, res) => {
    try {
        const { financial_year } = req.query;
        
        let query = `
            SELECT 
                tr.receipt_number,
                tr.financial_year,
                tr.issued_date,
                d.amount,
                u.name as donor_name,
                u.pan_number,
                c.title as campaign_title
            FROM tax_receipts tr
            JOIN donations d ON tr.donation_id = d.donation_id
            JOIN users u ON d.donor_id = u.user_id
            JOIN campaigns c ON d.campaign_id = c.campaign_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (financial_year) {
            query += ' AND tr.financial_year = ?';
            params.push(financial_year);
        }
        
        query += ' ORDER BY tr.issued_date DESC';
        
        const [receipts] = await pool.query(query, params);
        
        const [summary] = await pool.query(`
            SELECT 
                financial_year,
                COUNT(*) as total_receipts,
                SUM(d.amount) as total_amount
            FROM tax_receipts tr
            JOIN donations d ON tr.donation_id = d.donation_id
            GROUP BY financial_year
            ORDER BY financial_year DESC
        `);
        
        res.json({
            receipts,
            summary
        });
    } catch (error) {
        console.error('Tax receipt report error:', error);
        res.status(500).json({ error: 'Failed to generate tax receipt report' });
    }
});

module.exports = router;
