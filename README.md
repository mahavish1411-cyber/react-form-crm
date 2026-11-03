# React Form CRM

A full-stack Employee Management and Payroll CRM application built using **React, Node.js, Express.js, and MongoDB**.

The application provides a centralized workspace for managing employees, tracking attendance, calculating monthly payroll, generating payslips, and viewing employee-related reports.

## Project Overview

React Form CRM is designed to simplify day-to-day employee administration through a clean, responsive dashboard.

The system brings together employee information, attendance records, salary structures, payroll calculations, and reporting features in one application.

### Key Features

**1. Dashboard**
- Employee overview and summary cards
- Total, active, and inactive employee statistics
- Department information
- Recent employee activity

**2. Employee Management**
- Add new employees
- View employee information
- Edit employee details
- Delete employee records
- Manage employee status
- Department and designation management
- Employee salary structure management

**3. Attendance Management**
- Daily attendance tracking
- Monthly attendance summaries
- Present, late, half-day, and absent statuses
- Working-day calculations
- Attendance records and filtering

**4. Payroll Management**
- Monthly payroll generation
- Individual and bulk payroll generation
- Basic salary and allowances
- Attendance-based deductions
- Fixed employee deductions
- Other deductions
- Automatic net salary calculation
- Payroll recalculation
- Payment status management
- Paid-date tracking

**5. Payslip Generation**
- Professional employee payslip layout
- Employee and company information
- Monthly attendance summary
- Earnings and deductions breakdown
- Net salary details
- Payslip reference number
- Print and Save as PDF functionality

**6. Reports**
- Employee reports
- Attendance reports
- Payroll summaries
- Data visualization and reporting interfaces

**7. Settings and Help Center**
- Application settings interface
- Employee-related configuration
- Help and support interface

---

## Technology Stack

### Frontend

- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Axios

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- dotenv
- CORS

### Development Tools

- Visual Studio Code
- Git
- GitHub
- MongoDB Atlas
- MongoDB Compass
- Postman

### Deployment

- Frontend: Vercel
- Backend: Local development; production deployment pending
- Database: MongoDB Atlas

---

## Project Structure

```text
react-form/
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── employeeController.js
│   │   ├── attendanceController.js
│   │   └── payrollController.js
│   │
│   ├── models/
│   │   ├── Employee.js
│   │   ├── Attendance.js
│   │   └── Payroll.js
│   │
│   ├── routes/
│   │   ├── employeeRoutes.js
│   │   ├── attendanceRoutes.js
│   │   └── payrollRoutes.js
│   │
│   ├── server.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mahavish1411-cyber/react-form-crm.git
```

```bash
cd react-form-crm
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the backend directory.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

Replace the placeholder with your own MongoDB Atlas connection string.

Start the backend development server:

```bash
npm run dev
```

The backend runs locally on port `5000` by default.

### 3. Frontend Setup

Open another terminal.

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed by Vite, usually:

```text
http://localhost:5173
```

---

## API Endpoints

### Employee APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/employees` | Fetch employees |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |

### Attendance APIs

Attendance endpoints are available under:

```text
/api/attendance
```

They support attendance records and monthly attendance-related operations.

### Payroll APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/payroll?month=YYYY-MM` | Fetch monthly payroll |
| GET | `/api/payroll/:id` | Fetch payroll details |
| POST | `/api/payroll/generate` | Generate employee payroll |
| POST | `/api/payroll/generate-all` | Generate payroll for employees |
| PUT | `/api/payroll/:id/recalculate` | Recalculate payroll |
| PUT | `/api/payroll/:id/paid` | Mark payroll as paid |

---

## Payroll Calculation

The payroll module calculates monthly salary using employee salary information and attendance records.

### Earnings

```text
Gross Salary = Basic Salary + Allowance
```

### Deductions

```text
Total Deduction =
Attendance Deduction
+ Employee Deduction
+ Other Deduction
```

### Net Salary

```text
Net Salary = Gross Salary - Total Deduction
```

Attendance deductions are calculated using scheduled working days and applicable attendance records.

The current working-day configuration treats Monday through Friday as working days and Saturday and Sunday as holidays.

---

## Employee Salary Structure

Each employee can have an individual salary configuration.

| Component | Description |
|---|---|
| Basic Salary | Employee's base monthly salary |
| Allowance | Additional monthly earnings |
| Employee Deduction | Fixed employee-level deduction |
| Gross Salary | Basic salary plus allowance |
| Net Salary | Salary after applicable deductions |

Employee salary details are stored in MongoDB and used during payroll generation.

---

## Database

The application uses MongoDB Atlas with Mongoose for database operations.

Primary collections:

```text
employees
attendances
payrolls
```

The application connects to MongoDB through environment variables.

Database credentials must never be committed to the repository.

---

## Frontend Deployment

The React frontend is deployed using Vercel.

Deployment configuration:

| Setting | Value |
|---|---|
| Framework | Vite |
| Root Directory | frontend |
| Build Command | npm run build |
| Output Directory | dist |

**Deployment status:** Frontend deployed successfully.

**Backend deployment:** Pending.

Until the backend is deployed and connected, features requiring live API data may not function on the hosted frontend.

---

## Security Notes

This application manages employee information and payroll data.

Before using the application in production:

- Implement authentication and role-based authorization.
- Protect employee and payroll API endpoints.
- Configure appropriate CORS restrictions.
- Use secure environment variables.
- Never expose MongoDB credentials.
- Use a separate database with sample data for public demonstrations.
- Validate and sanitize API input.
- Configure database permissions appropriately.

**Current status:** Development/demo project. Production security hardening is required.

---

## Future Improvements

- User authentication and login
- Admin and employee roles
- Role-based access control
- Production backend deployment
- Email notifications
- Advanced reporting
- Employee self-service portal
- Payroll export features
- Automated testing

---

## Project Status

| Module | Status |
|---|---|
| Dashboard | Implemented |
| Employee Management | Implemented |
| Attendance Management | Implemented |
| Payroll Management | Implemented |
| Payslip Generation | Implemented |
| Reports | Implemented |
| Settings | Implemented |
| Help Center | Implemented |
| MongoDB Connection | Working locally |
| Frontend Deployment | Deployed |
| Production Backend | Pending |
| Authentication & Authorization | Pending |

---

## Author

**GitHub:** mahavish1411-cyber

**Repository:** react-form-crm

---

## License

No open-source license has been specified for this repository.

All rights reserved unless otherwise stated.
