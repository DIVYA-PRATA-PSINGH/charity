// Global state
let currentUser = null;
let token = null;
let campaigns = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    showSection('home');
    loadDashboardStats();
    loadCampaigns();
});

// Check authentication status
function checkAuthStatus() {
    token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
        currentUser = JSON.parse(userData);
        updateAuthUI();
    }
}

// Update auth UI
function updateAuthUI() {
    const authMenu = document.getElementById('authMenu');
    const userMenu = document.getElementById('userMenu');
    const adminMenu = document.getElementById('adminMenu');
    
    if (currentUser) {
        authMenu.style.display = 'none';
        userMenu.style.display = 'block';
        
        if (currentUser.role === 'admin' || currentUser.role === 'volunteer') {
            adminMenu.style.display = 'block';
        } else {
            adminMenu.style.display = 'none';
        }
    } else {
        authMenu.style.display = 'block';
        userMenu.style.display = 'none';
        adminMenu.style.display = 'none';
    }
}

// Show section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    // Load section-specific data
    switch(sectionId) {
        case 'campaigns':
            loadCampaigns();
            break;
        case 'donate':
            loadCampaignsForDonate();
            break;
        case 'my-donations':
            loadMyDonations();
            break;
        case 'admin':
            loadAdminDashboard();
            break;
        case 'beneficiaries':
            loadBeneficiaries();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Toggle mobile navigation
function toggleNav() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

// API Helper
async function apiCall(endpoint, options = {}) {
    const baseURL = window.location.origin;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        const response = await fetch(`${baseURL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

// Login handler
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const data = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        token = data.token;
        currentUser = data.user;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        updateAuthUI();
        showToast('Login successful!', 'success');
        showSection('home');
        
        // Clear form
        document.getElementById('loginForm').reset();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Register handler
async function handleRegister(e) {
    e.preventDefault();
    
    const userData = {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        password: document.getElementById('regPassword').value,
        role: document.getElementById('regRole').value,
        city: document.getElementById('regCity').value,
        state: document.getElementById('regState').value
    };
    
    try {
        await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        showToast('Registration successful! Please login.', 'success');
        showSection('login');
        document.getElementById('registerForm').reset();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    currentUser = null;
    updateAuthUI();
    showToast('Logged out successfully', 'success');
    showSection('home');
}

// Load dashboard stats
async function loadDashboardStats() {
    if (!token) return;
    
    try {
        const data = await apiCall('/api/reports/dashboard');
        const stats = data.stats;
        
        document.getElementById('totalRaised').textContent = `₹${parseInt(stats.total_donations_amount).toLocaleString('en-IN')}`;
        document.getElementById('totalDonors').textContent = stats.total_donors || 0;
        document.getElementById('activeCampaigns').textContent = stats.active_campaigns || 0;
        document.getElementById('beneficiariesCount').textContent = stats.active_beneficiaries || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load campaigns
async function loadCampaigns() {
    try {
        const data = await apiCall('/api/campaigns');
        campaigns = data.campaigns || [];
        renderCampaigns(campaigns);
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

// Render campaigns
function renderCampaigns(campaignsToRender) {
    const container = document.getElementById('campaigns-container');
    container.innerHTML = '';
    
    if (campaignsToRender.length === 0) {
        container.innerHTML = '<p class="no-data">No campaigns found.</p>';
        return;
    }
    
    campaignsToRender.forEach(campaign => {
        const card = document.createElement('div');
        card.className = 'campaign-card';
        
        const progress = (campaign.raised_amount / campaign.target_amount * 100).toFixed(0);
        
        card.innerHTML = `
            <div class="campaign-header">
                <span class="category-badge">${campaign.category}</span>
                <span class="status-badge status-${campaign.status}">${campaign.status}</span>
            </div>
            <h3>${campaign.title}</h3>
            <p class="campaign-description">${campaign.description || ''}</p>
            <div class="campaign-location">
                <i class="fas fa-map-marker-alt"></i>
                ${campaign.location || 'Various Locations'}, ${campaign.state || 'India'}
            </div>
            <div class="campaign-stats">
                <div class="stat">
                    <strong>Raised: ₹${parseInt(campaign.raised_amount).toLocaleString('en-IN')}</strong>
                </div>
                <div class="stat">
                    <strong>Target: ₹${parseInt(campaign.target_amount).toLocaleString('en-IN')}</strong>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
            </div>
            <div class="progress-text">${progress}% funded</div>
            ${currentUser ? `<button class="btn btn-primary" onclick="showDonateModal(${campaign.campaign_id})">
                <i class="fas fa-heart"></i> Donate Now
            </button>` : ''}
        `;
        
        container.appendChild(card);
    });
}

// Filter campaigns
function filterCampaigns() {
    const category = document.getElementById('campaignCategory').value;
    const state = document.getElementById('campaignState').value;
    
    let filtered = campaigns;
    
    if (category) {
        filtered = filtered.filter(c => c.category === category);
    }
    
    if (state) {
        filtered = filtered.filter(c => c.state === state);
    }
    
    renderCampaigns(filtered);
}

// Load campaigns for donate dropdown
async function loadCampaignsForDonate() {
    try {
        const data = await apiCall('/api/campaigns?status=active');
        const select = document.getElementById('donateCampaign');
        select.innerHTML = '<option value="">Select a campaign</option>';
        
        data.campaigns.forEach(campaign => {
            const option = document.createElement('option');
            option.value = campaign.campaign_id;
            option.textContent = `${campaign.title} (Target: ₹${parseInt(campaign.target_amount).toLocaleString('en-IN')})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

// Show donate modal
function showDonateModal(campaignId) {
    document.getElementById('donateCampaign').value = campaignId;
    showSection('donate');
}

// Handle donation
async function handleDonate(e) {
    e.preventDefault();
    
    if (!token) {
        showToast('Please login to donate', 'error');
        showSection('login');
        return;
    }
    
    const donationData = {
        campaign_id: parseInt(document.getElementById('donateCampaign').value),
        amount: parseFloat(document.getElementById('donateAmount').value),
        payment_method: document.getElementById('donateMethod').value,
        transaction_id: document.getElementById('donateTransactionId').value,
        anonymous: document.getElementById('donateAnonymous').checked,
        message: document.getElementById('donateMessage').value
    };
    
    try {
        const data = await apiCall('/api/donations', {
            method: 'POST',
            body: JSON.stringify(donationData)
        });
        
        showToast(`Donation successful! Receipt: ${data.receiptNumber}`, 'success');
        document.getElementById('donateForm').reset();
        loadDashboardStats();
        loadCampaigns();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Load my donations
async function loadMyDonations() {
    if (!token) return;
    
    try {
        const data = await apiCall('/api/donations/my-donations');
        const container = document.getElementById('my-donations-container');
        
        if (data.donations && data.donations.length > 0) {
            container.innerHTML = data.donations.map(donation => `
                <div class="donation-card">
                    <h4>${donation.campaign_title || 'General Donation'}</h4>
                    <p><strong>Amount:</strong> ₹${parseInt(donation.amount).toLocaleString('en-IN')}</p>
                    <p><strong>Date:</strong> ${new Date(donation.donation_date).toLocaleDateString()}</p>
                    <p><strong>Payment Method:</strong> ${donation.payment_method}</p>
                    <p><strong>Status:</strong> ${donation.payment_status}</p>
                    <p><strong>Receipt:</strong> ${donation.receipt_number}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="no-data">No donations yet.</p>';
        }
    } catch (error) {
        console.error('Error loading donations:', error);
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    if (!token || (currentUser.role !== 'admin' && currentUser.role !== 'volunteer')) return;
    
    try {
        const data = await apiCall('/api/reports/dashboard');
        const container = document.getElementById('adminDashboard');
        
        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card admin-stat">
                    <i class="fas fa-campground"></i>
                    <h3>${data.stats.active_campaigns}</h3>
                    <p>Active Campaigns</p>
                </div>
                <div class="stat-card admin-stat">
                    <i class="fas fa-users"></i>
                    <h3>${data.stats.total_donors}</h3>
                    <p>Total Donors</p>
                </div>
                <div class="stat-card admin-stat">
                    <i class="fas fa-user-friends"></i>
                    <h3>${data.stats.active_beneficiaries}</h3>
                    <p>Beneficiaries</p>
                </div>
                <div class="stat-card admin-stat">
                    <i class="fas fa-rupee-sign"></i>
                    <h3>₹${parseInt(data.stats.total_donations_amount).toLocaleString('en-IN')}</h3>
                    <p>Total Donations</p>
                </div>
            </div>
            
            <h3 class="section-subtitle">Recent Donations</h3>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Donor</th>
                            <th>Campaign</th>
                            <th>Amount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.recentDonations.slice(0, 10).map(d => `
                            <tr>
                                <td>${d.donor_name || 'Anonymous'}</td>
                                <td>${d.campaign_title}</td>
                                <td>₹${parseInt(d.amount).toLocaleString('en-IN')}</td>
                                <td>${new Date(d.donation_date).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

// Load beneficiaries
async function loadBeneficiaries() {
    if (!token || (currentUser.role !== 'admin' && currentUser.role !== 'volunteer')) return;
    
    try {
        const data = await apiCall('/api/beneficiaries');
        const container = document.getElementById('beneficiaries-container');
        
        if (data.beneficiaries && data.beneficiaries.length > 0) {
            container.innerHTML = data.beneficiaries.map(b => `
                <div class="beneficiary-card">
                    <h4>${b.name}</h4>
                    <p><strong>Age:</strong> ${b.age || 'N/A'}</p>
                    <p><strong>Category:</strong> ${b.category}</p>
                    <p><strong>Location:</strong> ${b.city || ''}, ${b.state || ''}</p>
                    <p><strong>Status:</strong> ${b.status}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="no-data">No beneficiaries found.</p>';
        }
    } catch (error) {
        console.error('Error loading beneficiaries:', error);
    }
}

// Load reports
async function loadReports() {
    if (!token || (currentUser.role !== 'admin' && currentUser.role !== 'volunteer')) return;
    
    const container = document.getElementById('reports-container');
    container.innerHTML = '<p>Reports feature coming soon...</p>';
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
