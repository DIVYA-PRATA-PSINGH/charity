const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Password',
    database: process.env.DB_NAME || 'charity_management'
});

async function verifyDatabase() {
    try {
        console.log('Verifying database setup...\n');
        
        // Check tables
        const [tables] = await connection.promise().query('SHOW TABLES');
        console.log('Tables found:', tables.length);
        tables.forEach(table => {
            console.log('  -', Object.values(table)[0]);
        });
        
        // Check users
        const [users] = await connection.promise().query('SELECT * FROM users LIMIT 1');
        console.log('\nUsers table:', users.length > 0 ? '✓ Has data' : '✗ Empty');
        
        // Check campaigns
        const [campaigns] = await connection.promise().query('SELECT * FROM campaigns LIMIT 1');
        console.log('Campaigns table:', campaigns.length > 0 ? '✓ Has data' : '✗ Empty');
        
        if (users.length > 0) {
            console.log('\nAdmin user:', users[0]);
        }
        
        if (campaigns.length > 0) {
            console.log('\nSample campaign:', campaigns[0].title);
        }
        
        connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Database verification error:', error.message);
        connection.end();
        process.exit(1);
    }
}

verifyDatabase();

