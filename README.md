# EcoIntuition Academy (MERN Stack)

EcoIntuition Academy is a formal, professional educational platform built with a **Node.js, Express, and MongoDB (MERN Stack)** backend and a **React (Vite)** frontend. It features custom email-based JWT authentication, a courses and modules data model, and a custom CSS design system using academic *warm paper* and *ink navy* styling.

---

## Project Structure

```
├── backend/            # Node.js + Express + MongoDB REST API server
│   ├── config/         # Database connection logic (Mongoose & in-memory fallback)
│   ├── middleware/     # JWT authentication protection middleware
│   ├── models/         # User and Course Mongoose schemas
│   ├── routes/         # Auth and Course route handlers
│   ├── .env            # Environment configuration (Port, JWT Secrets, Mongo URI)
│   ├── package.json    # Node.js dependencies & scripts
│   ├── seed.js         # Initial database seeding script
│   └── server.js       # Main Express app entry point
├── frontend/           # React + Vite client app
│   ├── src/
│   │   ├── components/ # Navbar, Footer, and layout structures
│   │   ├── context/    # Global AuthContext provider
│   │   ├── pages/      # Home, Courses, About, Projects, Login, and Signup pages
│   │   ├── App.jsx     # Main Routing layout
│   │   └── index.css   # Tailored custom CSS variable design system
│   ├── index.html      # Document template with Google Fonts
│   └── vite.config.js  # Vite server proxy rules for development (port 5000)
└── README.md           # Project documentation (this file)
```

---

## Backend Setup (Node.js + Express + MongoDB)

The backend runs on **Node.js 18+** using **Express.js** and **Mongoose (MongoDB)**.

### 1. Install Dependencies
Navigate to the `backend/` directory and install dependencies:
```bash
cd backend
npm install
```

### 2. Environment Variables (`.env`)
The `.env` file in `backend/` is configured with standard defaults:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/aintuition_db
JWT_SECRET=aintuition_super_secret_jwt_access_key_2026
JWT_REFRESH_SECRET=aintuition_super_secret_jwt_refresh_key_2026
NODE_ENV=development
```

> [!NOTE]
> **Zero-Setup Database Fallback**: If a local MongoDB instance is not running on port `27017`, the backend automatically spins up a seamless **In-Memory MongoDB server** (`mongodb-memory-server`) so you can develop immediately without installing MongoDB locally.

### 3. Seed Database (Optional)
To manually reset and populate initial sample course data and an admin user:
```bash
npm run seed
```

Pre-configured development superuser:
- **Email**: `admin@aintuition.com`
- **Password**: `adminpassword123`

### 4. Start Development Server
Run the local development API server:
```bash
npm run dev
```
The backend API will run at `http://localhost:5000/`.

---

## Frontend Setup (React + Vite)

The frontend is bootstrapped with React and Vite. It utilizes plain CSS and `react-router-dom` for routing.

### 1. Install Packages
Navigate to the `frontend/` directory and install packages:
```bash
cd frontend
npm install
```

### 2. Start Vite Development Server
Run the client dev server:
```bash
npm run dev
```
The frontend will run at `http://localhost:5173/`. 
All requests to `/api/*` are automatically proxied to the Express server at `http://127.0.0.1:5000/`.

---

## API Endpoints

### Authentication `/api/auth/`
* `POST /api/auth/register/` - Create a new account. Returns user profile, access JWT, and refresh JWT immediately.
* `POST /api/auth/login/` - Login with email and password. Returns access and refresh JWT.
* `POST /api/auth/token/refresh/` - Refresh expired access tokens.
* `GET /api/auth/me/` - Retrieve current user profile (requires `Authorization: Bearer <access_token>` header).

### Courses `/api/courses/` (Read-only)
* `GET /api/courses/` - Retrieve list of published courses.
* `GET /api/courses/<slug>/` - Retrieve details of a published course including its related modules.
