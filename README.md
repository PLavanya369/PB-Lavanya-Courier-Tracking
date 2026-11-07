# Lavanya Courier Tracking Management System

A multi-page academic mini project built with HTML, CSS, JavaScript, Express.js and MySQL.

## Pages
Home, About Us, Services, Book Courier, Track Parcel, Customer Registration, Contact Us, Admin Dashboard and Delivery Staff.

## Requirements
- Node.js 18+
- MySQL 8+
- VS Code (recommended)

## Setup
1. Extract the ZIP and open the project folder in VS Code.
2. Open MySQL Workbench and run all statements in `database.sql`.
3. Copy `.env.example` to `.env` and update your MySQL password.
4. Open a terminal in the project folder and run:
   ```bash
   npm install
   npm start
   ```
5. Open `http://localhost:3000`.

## Demo admin login
- Username: `admin`
- Password: `Admin@123`

The server creates this demo administrator automatically after the database schema exists. Change the demo password and session secret before any public deployment.

## Main API routes
- `POST /api/register` — create customer
- `POST /api/bookings` — create parcel booking and initial tracking event
- `GET /api/track/:id` — retrieve parcel and tracking history
- `POST /api/contact` — demo contact acknowledgement
- `POST /api/admin/login` — admin login
- `GET /api/admin/summary` — dashboard summary (admin session required)
- `GET /api/admin/parcels` — list parcels (admin session required)
- `GET /api/admin/customers` — list customers (admin session required)
- `POST /api/admin/tracking` — add tracking event and update parcel status (admin session required)

## Database tables
- `Customers`
- `Parcels`
- `Tracking`
- `Admins` (for demo administrator login)

## Important notes
- The three requested core tables and their field names are retained. `Admins` is an additional table for authentication.
- The contact page is a frontend/demo endpoint; it does not send email or persist messages.
- This is an educational starter project, not a production courier platform. For production, add CSRF protection, rate limiting, stronger role-based staff accounts, password reset, input validation, HTTPS, audit logs, privacy controls and real email/SMS integrations.
- Demo contact details and service claims should be replaced with verified information before presentation/deployment.
