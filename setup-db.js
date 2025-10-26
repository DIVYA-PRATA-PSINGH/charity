const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Password',
    multipleStatements: true
});

const schema = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');

async function setupDatabase() {
    try {
        console.log('Setting up database...\n');
        
        // Drop database if exists
        try {
            await connection.promise().query('DROP DATABASE IF EXISTS charity_management');
            console.log('✓ Dropped existing database');
        } catch (err) {
            // Ignore errors
        }
        
        // Create database
        await connection.promise().query('CREATE DATABASE charity_management');
        console.log('✓ Created database charity_management');
        
        // Switch to new database
        await connection.promise().query('USE charity_management');
        console.log('✓ Using charity_management database\n');
        
        // Execute the entire schema at once
        await connection.promise().query(schema);
        console.log('✓ Executed schema file\n');
        
        // Verify tables were created
        const [tables] = await connection.promise().query('SHOW TABLES');
        console.log(`✓ Created ${tables.length} tables:`);
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });
        
        // Verify data was inserted
        const [users] = await connection.promise().query('SELECT COUNT(*) as count FROM users');
        console.log(`\n✓ Users in database: ${users[0].count}`);
        
        const [campaigns] = await connection.promise().query('SELECT COUNT(*) as count FROM campaigns');
        console.log(`✓ Campaigns in database: ${campaigns[0].count}`);
        
        console.log('\n✓ Database setup complete!\n');
        console.log('Default Admin Credentials:');
        console.log('  Email: admin@charity.org');
        console.log('  Password: admin123\n');
        
        connection.end();
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Error setting up database:', error.message);
        if (error.sqlState) {
            console.error('SQL State:', error.sqlState);
        }
        connection.end();
        process.exit(1);
    }
}

setupDatabase();
