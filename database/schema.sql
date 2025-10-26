-- Charity Management System Database Schema
-- MySQL Database for Indian Context

DROP DATABASE IF EXISTS charity_management;
CREATE DATABASE charity_management;
USE charity_management;

-- Users table (for admins, volunteers, donors)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'volunteer', 'donor') DEFAULT 'donor',
    pan_number VARCHAR(10),
    aadhaar_number VARCHAR(12),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

-- Campaigns table
CREATE TABLE campaigns (
    campaign_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('education', 'healthcare', 'disaster_relief', 'poverty_alleviation', 'women_empowerment', 'child_welfare', 'rural_development', 'other') NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    raised_amount DECIMAL(12, 2) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    location VARCHAR(100),
    state VARCHAR(50),
    image_url VARCHAR(255),
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Donations table
CREATE TABLE donations (
    donation_id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT,
    campaign_id INT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('upi', 'card', 'netbanking', 'cheque', 'cash') NOT NULL,
    transaction_id VARCHAR(100),
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    receipt_number VARCHAR(50) UNIQUE,
    donation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tax_benefit BOOLEAN DEFAULT TRUE,
    anonymous BOOLEAN DEFAULT FALSE,
    message TEXT,
    FOREIGN KEY (donor_id) REFERENCES users(user_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
);

-- Beneficiaries table
CREATE TABLE beneficiaries (
    beneficiary_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    age INT,
    gender ENUM('male', 'female', 'other'),
    aadhaar_number VARCHAR(12),
    phone VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(6),
    category ENUM('education', 'healthcare', 'livelihood', 'housing', 'other') NOT NULL,
    income_level ENUM('BPL', 'APL', 'AAY') COMMENT 'Below Poverty Line, Above Poverty Line, Antyodaya Anna Yojana',
    family_members INT,
    description TEXT,
    status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
    registered_by INT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (registered_by) REFERENCES users(user_id)
);

-- Aid Distribution table
CREATE TABLE aid_distribution (
    distribution_id INT PRIMARY KEY AUTO_INCREMENT,
    beneficiary_id INT NOT NULL,
    campaign_id INT,
    aid_type ENUM('monetary', 'food', 'clothing', 'education', 'medical', 'shelter', 'other') NOT NULL,
    amount DECIMAL(10, 2),
    description TEXT,
    quantity INT,
    distribution_date DATE NOT NULL,
    distributed_by INT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(beneficiary_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id),
    FOREIGN KEY (distributed_by) REFERENCES users(user_id)
);

-- Volunteers table
CREATE TABLE volunteer_activities (
    activity_id INT PRIMARY KEY AUTO_INCREMENT,
    volunteer_id INT NOT NULL,
    campaign_id INT,
    activity_type VARCHAR(100),
    hours_contributed DECIMAL(5, 2),
    activity_date DATE NOT NULL,
    description TEXT,
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (volunteer_id) REFERENCES users(user_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
);

-- Tax Receipts (80G certification for Indian tax benefits)
CREATE TABLE tax_receipts (
    receipt_id INT PRIMARY KEY AUTO_INCREMENT,
    donation_id INT NOT NULL,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    section VARCHAR(10) DEFAULT '80G' COMMENT 'Income Tax Section',
    issued_date DATE NOT NULL,
    pdf_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id)
);

-- Expenses table
CREATE TABLE expenses (
    expense_id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT,
    category ENUM('administrative', 'operational', 'program', 'marketing', 'other') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    vendor_name VARCHAR(100),
    bill_number VARCHAR(50),
    approved_by INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

-- Insert default admin user (password: admin123)
-- Password hash generated using bcryptjs with 10 rounds
INSERT INTO users (name, email, phone, password_hash, role, city, state)
VALUES ('Admin User', 'admin@charity.org', '9876543210', 
        '$2a$10$cwf.P2UJ.ZZo1ImgVUNlCuQXDbTOa4YQeQjwtCZqI0kEnhDmTbFnm', 'admin', 'Mumbai', 'Maharashtra');

-- Insert sample campaigns
INSERT INTO campaigns (title, description, category, target_amount, start_date, location, state, created_by)
VALUES 
('Education for Underprivileged Children', 'Provide quality education to children from underprivileged backgrounds in rural areas', 'education', 500000.00, '2025-01-01', 'Rural Maharashtra', 'Maharashtra', 1),
('Healthcare Support for Rural Areas', 'Mobile medical units for remote villages', 'healthcare', 750000.00, '2025-01-15', 'Various Districts', 'Uttar Pradesh', 1),
('Flood Relief Fund 2025', 'Emergency relief for flood-affected families', 'disaster_relief', 1000000.00, '2025-02-01', 'Coastal Areas', 'Kerala', 1);

-- Create views for reporting
CREATE VIEW campaign_summary AS
SELECT 
    c.campaign_id,
    c.title,
    c.category,
    c.target_amount,
    c.raised_amount,
    COUNT(DISTINCT d.donation_id) as total_donations,
    COUNT(DISTINCT d.donor_id) as unique_donors,
    (c.raised_amount / c.target_amount * 100) as completion_percentage,
    c.status
FROM campaigns c
LEFT JOIN donations d ON c.campaign_id = d.campaign_id AND d.payment_status = 'completed'
GROUP BY c.campaign_id;

CREATE VIEW donor_summary AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    COUNT(d.donation_id) as total_donations,
    SUM(d.amount) as total_donated,
    MAX(d.donation_date) as last_donation_date
FROM users u
LEFT JOIN donations d ON u.user_id = d.donor_id AND d.payment_status = 'completed'
WHERE u.role = 'donor'
GROUP BY u.user_id;

-- Indexes for better performance
CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_campaign ON donations(campaign_id);
CREATE INDEX idx_donations_date ON donations(donation_date);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_beneficiaries_status ON beneficiaries(status);
CREATE INDEX idx_users_role ON users(role);
