# Charity Management System - India

A full-stack charity management system designed specifically for the Indian context, featuring campaign management, beneficiary tracking, donations with 80G tax receipt generation, and comprehensive reporting.

## Features

- **User Management**: Admin, Volunteer, and Donor roles with secure authentication
- **Campaign Management**: Create and manage fundraising campaigns across different categories
- **Donations**: Multiple payment methods (UPI, Card, Net Banking, Cheque, Cash) with automatic receipt generation
- **Beneficiary Tracking**: Comprehensive beneficiary database with aid distribution records
- **Tax Compliance**: Automatic 80G tax receipt generation for Indian tax benefits
- **Reporting**: Dashboard with financial reports, donor analytics, and campaign performance metrics
- **Indian Context**: Support for Aadhaar, PAN, state-wise tracking, and BPL/APL categories

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Frontend**: HTML, CSS, JavaScript (Vanilla JS)

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd charity_proj
```

### 2. Install dependencies
```bash
npm install
```

### 3. Database Setup

Create the MySQL database using the provided schema:

```bash
# Login to MySQL
mysql -u root -p

# Run the schema file
source database/schema.sql
```

Or manually:
```sql
mysql -u root -p < database/schema.sql
```

### 4. Environment Configuration

The `.env` file is already configured with:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Password
DB_NAME=charity_management
DB_PORT=3306
JWT_SECRET=your_super_secret_jwt_key_for_charity_management_system_2025
NODE_ENV=development
PORT=3000
```

**Note**: Update the database password if different from 'Password'

### 5. Start the server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

## Default Admin Credentials

- **Email**: admin@charity.org
- **Password**: admin123

## Database Schema

The database includes the following tables:

- **users**: User accounts (admin, volunteer, donor)
- **campaigns**: Fundraising campaigns
- **donations**: Donation records with payment tracking
- **beneficiaries**: Beneficiary information
- **aid_distribution**: Aid distribution records
- **tax_receipts**: 80G tax receipts for donations
- **expenses**: Campaign and operational expenses
- **volunteer_activities**: Volunteer activity tracking

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Campaigns
- `GET /api/campaigns` - Get all campaigns (public)
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns` - Create campaign (admin/volunteer)
- `PUT /api/campaigns/:id` - Update campaign (admin)
- `DELETE /api/campaigns/:id` - Delete campaign (admin)

### Donations
- `GET /api/donations` - Get all donations (admin/volunteer)
- `GET /api/donations/my-donations` - Get user's donations
- `POST /api/donations` - Create donation (authenticated)
- `GET /api/donations/:id` - Get donation details

### Beneficiaries
- `GET /api/beneficiaries` - Get all beneficiaries (admin/volunteer)
- `POST /api/beneficiaries` - Register beneficiary (admin/volunteer)
- `GET /api/beneficiaries/:id` - Get beneficiary details

### Reports
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/financial` - Financial reports
- `GET /api/reports/donors` - Donor analytics
- `GET /api/reports/campaign-performance` - Campaign performance
- `GET /api/reports/tax-receipts` - Tax receipt reports

## User Roles

### Admin
- Full system access
- Manage campaigns, beneficiaries, and donations
- Access all reports and analytics
- Approve expenses

### Volunteer
- Can create campaigns
- Register and manage beneficiaries
- View reports and analytics

### Donor
- Browse and donate to campaigns
- View own donation history
- Download tax receipts

## Campaign Categories

- Education
- Healthcare
- Disaster Relief
- Poverty Alleviation
- Women Empowerment
- Child Welfare
- Rural Development
- Other

## Beneficiary Categories

- Education
- Healthcare
- Livelihood
- Housing
- Other

## Payment Methods

- UPI
- Card
- Net Banking
- Cheque
- Cash

## Tax Benefits (80G)

The system automatically generates 80G compliant tax receipts for all donations, allowing donors to claim tax deductions as per Indian Income Tax Act.

## Development

### Project Structure
```
charity_proj/
├── config/
│   └── database.js          # Database configuration
├── database/
│   └── schema.sql           # Database schema
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── campaigns.js          # Campaign routes
│   ├── donations.js          # Donation routes
│   ├── beneficiaries.js      # Beneficiary routes
│   └── reports.js            # Report routes
├── public/
│   ├── css/
│   │   └── style.css         # Frontend styles
│   ├── js/
│   │   └── app.js            # Frontend JavaScript
│   └── index.html            # Frontend HTML
├── server.js                 # Main server file
├── package.json              # Dependencies
└── .env                      # Environment variables
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt (10 rounds)
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention (parameterized queries)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For issues and questions, please contact the development team or open an issue on the repository.

## Acknowledgments

Built with ❤️ for Indian charitable organizations to streamline their operations and maximize their impact.

