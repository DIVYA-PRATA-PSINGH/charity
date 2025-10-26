# Quick Setup Guide

## Database Setup

The database has been created! The `setup-db.js` script has been executed and the MySQL database `charity_management` is now ready.

### Default Admin Credentials
- **Email**: admin@charity.org
- **Password**: admin123

### Manual Database Setup (if needed)

If you need to manually create or recreate the database:

1. Open MySQL command line or MySQL Workbench
2. Run the schema file:
   ```sql
   source database/schema.sql
   ```
   Or in MySQL Workbench: File → Open SQL Script → Select `database/schema.sql` → Run

## Starting the Server

The server should now be running. If not, start it with:

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## Features Available

### For All Users:
- View all campaigns
- Register as a donor
- Login/Logout

### For Donors:
- Browse and donate to campaigns
- View donation history
- Download tax receipts (80G)

### For Admin/Volunteer:
- Create and manage campaigns
- Register beneficiaries
- View comprehensive reports
- Track donations and expenses
- Generate financial reports

## Database Credentials

The application uses these database settings (configured in `.env`):
- Host: localhost
- User: root
- Password: Password (change this in production!)
- Database: charity_management
- Port: 3306

## Troubleshooting

### Database Connection Issues
1. Make sure MySQL is running
2. Check that the password in `.env` matches your MySQL password
3. Verify the database exists: `SHOW DATABASES;`

### Server Won't Start
1. Check if port 3000 is already in use
2. Verify all dependencies are installed: `npm install`
3. Check server logs for specific errors

### Can't Login
1. Make sure the database was created with the schema
2. Try creating a new user via the registration page
3. Default admin login: admin@charity.org / admin123

## Next Steps

1. Open http://localhost:3000
2. Register as a donor or login as admin
3. Explore the campaigns
4. Try making a donation
5. Check the admin dashboard for reports

## Sample Data

The database comes pre-populated with:
- 1 admin user (admin@charity.org / admin123)
- 3 sample campaigns (Education, Healthcare, Disaster Relief)
- View existing campaigns on the homepage

## Important Notes

⚠️ **Security Warning**: 
- Change the default admin password immediately
- Update JWT_SECRET in production
- Use strong database passwords in production
- Enable HTTPS in production

## Support

For any issues:
1. Check the terminal/console for error messages
2. Verify database connectivity
3. Ensure all dependencies are installed
4. Review the README.md for detailed documentation

