# School Management System

A comprehensive school management system built with Flask, featuring student management, attendance tracking, fee collection, and advanced analytics.

## Features

- **User Management**
  - Role-based authentication (Admin, Teacher)
  - Secure password handling
  - Session management

- **Core Modules**
  - Student Management (enrollment, profiles, bulk CSV import)
  - Teacher Management (assignments, subjects)
  - Classroom Management (grades, sections)
  - Subject Management
  - Attendance Tracking
  - Fee Management

- **Analytics & Reporting**
  - Time-series Analytics (attendance, fees)
  - Subject-wise Performance Metrics
  - Comparative Class Analytics
  - Financial Forecasting
  - Custom Report Generation
  - Data Export (CSV)

- **API Integration**
  - RESTful API endpoints
  - Secure authentication
  - Comprehensive documentation
  - Integration examples

## Technology Stack

- **Backend**: Python 3.11, Flask
- **Database**: SQLite (production: PostgreSQL recommended)
- **ORM**: SQLAlchemy
- **Frontend**: Bootstrap 5, JavaScript
- **Testing**: pytest, coverage
- **Documentation**: Swagger/OpenAPI
- **Deployment**: Docker, GitHub Actions

## Quick Start

### Using Management Script

```powershell
# Initialize environment
.\manage.ps1 init

# Start development server
.\manage.ps1 dev

# Run tests with coverage
.\manage.ps1 test coverage

# Initialize database with sample data
.\manage.ps1 db seed

# Build and run with Docker
.\manage.ps1 docker run
```

### Manual Setup

```powershell
# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -c "from app import create_app; from models import db; app = create_app(); app.app_context().push(); db.create_all()"

# Run development server
flask run
```

## Project Structure

```
school_management/
├── app.py                 # Application factory
├── models.py             # Database models
├── routes/              # Route blueprints
│   ├── api.py          # API endpoints
│   ├── auth.py         # Authentication
│   ├── students.py     # Student management
│   └── ...
├── templates/          # HTML templates
├── static/            # Static assets
├── tests/             # Test suite
├── scripts/           # Utility scripts
├── instance/         # Instance configuration
├── Dockerfile        # Docker configuration
├── manage.ps1        # Management script
└── requirements.txt  # Python dependencies
```

## Bulk Student Import (CSV)

The system supports bulk student registration via CSV import, making it easy to add hundreds of students at once.

### CSV Import Features

- **Bulk Registration**: Import up to 500+ students in a single operation
- **Smart Validation**: Automatic validation of required fields and data formats
- **Duplicate Detection**: Skip existing students based on email or roll number
- **Error Reporting**: Detailed error reports with row-by-row feedback
- **Template Download**: Pre-formatted CSV template for easy data preparation
- **Progress Tracking**: Real-time import progress and results summary

### CSV Format Requirements

**Required Columns:**
- `first_name` - Student's first name
- `last_name` - Student's last name

**Optional Columns:**
- `email` - Student's email address (must be unique)
- `roll_number` - Student roll number (must be unique)
- `phone` - Student phone number
- `gender` - Male/Female
- `father_name` - Father's full name
- `mother_name` - Mother's full name
- `parent_phone` - Parent's phone number
- `parent_email` - Parent's email address
- `permanent_address` - Permanent address
- `correspondence_address` - Correspondence address
- `date_of_birth` - Date in YYYY-MM-DD format

### How to Use CSV Import

1. **Download Template**: Click "Download CSV Template" to get the correct format
2. **Prepare Data**: Fill in student information following the template
3. **Upload File**: Use the import page to upload your CSV file
4. **Review Results**: Check the detailed import results and error reports

### Sample CSV Data

```csv
first_name,last_name,email,roll_number,phone,gender,father_name,mother_name,parent_phone,date_of_birth
Rahul,Sharma,rahul.sharma@example.com,2024001,+919876543210,Male,Rajesh Sharma,Priya Sharma,+919876543210,2005-03-15
Priya,Verma,priya.verma@example.com,2024002,+919876543211,Female,Amit Verma,Anita Verma,+919876543211,2005-07-22
```

## API Documentation

### Core Endpoints
- `GET /api/students` - List all students
- `GET /api/teachers` - List all teachers
- `GET /api/classes` - List all classes

### Analytics Endpoints
- `GET /api/analytics/time-series/<metric>/<period>` - Time-based analytics
- `GET /api/analytics/subjects` - Subject-wise analytics
- `GET /api/analytics/compare/<metric>` - Comparative analytics
- `GET /api/analytics/financial/forecast` - Financial forecasting

## Testing

```powershell
# Run all tests
.\manage.ps1 test

# Run with coverage report
.\manage.ps1 test coverage
```

## Deployment

### Docker Deployment

```powershell
# Build image
docker build -t school-management .

# Run container
docker run -p 5000:5000 -v ${PWD}/instance:/app/instance school-management
```

### Production Considerations

1. **Database**
   - Switch to PostgreSQL for production
   - Set up regular backups
   - Implement connection pooling

2. **Security**
   - Use environment variables for secrets
   - Set up HTTPS
   - Implement rate limiting
   - Regular security updates

3. **Performance**
   - Configure gunicorn workers
   - Set up caching
   - Optimize database queries
   - Monitor performance metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Test Accounts

<!-- Force Vercel redeploy - final fixes applied -->

### Available Login Credentials:
- **Admin Account**: `admin@example.com` / `adminpass`
- **Staff Account**: `staff@example.com` / `staffpass`

### Features to Explore:
- **Student Management**: Add/edit students with Aadhaar card validation, bulk CSV import
- **CSV Import**: Bulk student registration with template download and error reporting
- **Fee Management**: Premium fee forms with father name on receipts
- **Analytics Dashboard**: Comprehensive school analytics
- **Premium UI**: Enhanced sidebar with glow effects and animations

## Support

For support and questions, please open an issue in the GitHub repository.
