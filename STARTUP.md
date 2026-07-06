# ⚡ School Management System - Quick Start

## Development Mode

**Start Frontend Dev Server (with hot reload):**
```bash
npm run dev
```
Runs on: `http://localhost:5173`

## Production Mode

**1. Build the project:**
```bash
npm run build
```
Creates optimized build in `dist/` folder.

**2. Start the Node.js server:**
```bash
npm start
```
or
```bash
npm run server
```
Runs on: `http://localhost:5000`

## Project Structure

```
/src
  ├── /pages          # Page components (dashboard, students, etc.)
  ├── /layouts        # Layout wrappers (DashboardLayout, AuthLayout)
  ├── /components     # Reusable components
  ├── /services       # API service stubs
  ├── /utils          # Helper functions and constants
  ├── /styles         # CSS files
  ├── /assets         # Images, icons
  └── App.jsx         # Main router
```

## Available Routes

- **Dashboard:** `/dashboard`
- **Auth:** `/auth/login`, `/auth/register`, `/auth/forgot-password`
- **Students:** `/students`, `/students/add`, `/students/profile`, `/students/data-files`
- **Attendance:** `/attendance`, `/attendance/report`
- **Transport:** `/transport`, `/transport/routes`, `/transport/drivers`
- **Examination:** `/examination`, `/examination/schedule`, `/examination/results`, `/examination/grading`
- **Fees:** `/fees`, `/fees/payments`, `/fees/reports`
- **Settings:** `/settings/profile`, `/settings/logout`

## API Endpoints (Backend)

- `GET /api/students` - Fetch all students
- `POST /api/students` - Add new student
- `GET /api/teachers` - Fetch all teachers
- `POST /api/teachers` - Add new teacher
- `GET /api/attendance` - Fetch attendance records
- `POST /api/attendance` - Record attendance
- `GET /api/fees` - Fetch fee records
- `POST /api/fees` - Add fee payment
- `GET /api/exams` - Fetch exam sessions
- `POST /api/exams` - Add exam session

## Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Build for production
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
npm start         # Start Express backend (production)
npm run server    # Start Express backend (development)
```

## Notes

✅ React 19.2.5 + Vite frontend
✅ Express.js backend for API routes
✅ React Router for navigation
✅ Modern modular page structure
✅ Full-stack ready for database integration
