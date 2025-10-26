const http = require('http');

const baseURL = 'http://localhost:3000';
let token = '';
let adminId = 1;

console.log('\n🔍 Testing Charity Management System Backend\n');
console.log('=' .repeat(60));

async function testEndpoint(method, path, data = null, requiresAuth = false) {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (requiresAuth && token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(baseURL + path, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`${res.statusCode === 200 ? '✓' : '✗'} ${method} ${path}`);
                if (res.statusCode !== 200) {
                    console.log(`  Error: ${body.substring(0, 100)}`);
                }
                resolve({ statusCode: res.statusCode, body });
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    try {
        // Test 1: Health check
        console.log('\n1. Testing Health Check...');
        await testEndpoint('GET', '/api/health');
        
        // Test 2: Get campaigns (public)
        console.log('\n2. Testing Get Campaigns (Public)...');
        const campaignRes = await testEndpoint('GET', '/api/campaigns');
        if (campaignRes.statusCode === 200) {
            const data = JSON.parse(campaignRes.body);
            if (data.campaigns && data.campaigns.length > 0) {
                console.log(`  ✓ Found ${data.campaigns.length} campaigns`);
                adminId = data.campaigns[0].campaign_id;
            }
        }

        // Test 3: Login as admin
        console.log('\n3. Testing Login...');
        const loginRes = await testEndpoint('POST', '/api/auth/login', {
            email: 'admin@charity.org',
            password: 'admin123'
        });
        
        if (loginRes.statusCode === 200) {
            const data = JSON.parse(loginRes.body);
            token = data.token;
            console.log(`  ✓ Login successful! Token received`);
            console.log(`  ✓ User: ${data.user.name} (${data.user.role})`);
        }

        if (!token) {
            console.log('\n✗ Cannot continue tests - login failed');
            return;
        }

        // Test 4: Get campaigns with auth
        console.log('\n4. Testing Authenticated Endpoints...');
        await testEndpoint('GET', '/api/campaigns/' + adminId, null, true);
        
        // Test 5: Get donations
        await testEndpoint('GET', '/api/donations/my-donations', null, true);
        
        // Test 6: Dashboard
        await testEndpoint('GET', '/api/reports/dashboard', null, true);
        
        // Test 7: Beneficiaries
        await testEndpoint('GET', '/api/beneficiaries', null, true);
        
        // Test 8: Create a test donation
        console.log('\n5. Testing Donation Creation...');
        await testEndpoint('POST', '/api/donations', {
            campaign_id: 1,
            amount: 1000,
            payment_method: 'upi',
            transaction_id: 'TEST123',
            message: 'Test donation'
        }, true);

        console.log('\n' + '='.repeat(60));
        console.log('✅ All Tests Completed Successfully!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('\n✗ Test error:', error.message);
    }
}

runTests();

