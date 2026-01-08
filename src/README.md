# School Management System API

A production-grade School Management System API built with Node.js, Express, MongoDB, and Redis.

## Features

- **Authentication**: JWT-based authentication with secure login
- **Role-Based Access Control (RBAC)**:
  - **SUPERADMIN**: Full system access - can manage all schools, classrooms, and students
  - **SCHOOL_ADMIN**: Scoped access - can only manage resources within their assigned school
- **Rate Limiting**: Redis-backed rate limiting for API protection (100 requests/15 min)
- **Input Validation**: Strict Joi validation on all write operations
- **Swagger Documentation**: Auto-generated OpenAPI 3.0 documentation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Caching/Rate Limiting**: Redis (ioredis)
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: Joi
- **Documentation**: Swagger (swagger-ui-express, swagger-jsdoc)
- **Testing**: Jest + Supertest
- **Security**: Helmet, CORS

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── index.js      # Environment configuration
│   ├── database.js   # MongoDB connection
│   ├── redis.js      # Redis connection
│   └── swagger.js    # Swagger configuration
├── controllers/      # Request handlers
├── middleware/       # Express middleware
│   ├── auth.middleware.js     # JWT authentication
│   ├── rbac.middleware.js     # Role-based access control
│   ├── scope.middleware.js    # School-based scoping
│   ├── rateLimiter.middleware.js  # Redis rate limiting
│   └── errorHandler.middleware.js # Error handling
├── models/           # Mongoose models
├── routes/           # API routes with Swagger docs
├── services/         # Business logic
├── validators/       # Joi validation schemas
└── server.js         # Application entry point

tests/
├── setup.js          # Jest setup
├── helpers/          # Test utilities
├── auth.test.js      # Authentication tests
├── rbac.test.js      # RBAC tests
└── integration.test.js # Integration tests
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/school-management

# Redis Configuration
REDIS_URI=redis://127.0.0.1:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Setup Secret (for initial superadmin creation)
SETUP_SECRET=initial-setup-secret-key-change-in-production

# Bcrypt Configuration
BCRYPT_SALT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=*
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test
```

## API Documentation

After starting the server, visit:
- **Swagger UI**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/api/health

## API Endpoints

### Authentication
- `POST /api/auth/setup` - Create initial superadmin (protected by setup secret)
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile

### Schools (Superadmin Only)
- `POST /api/schools` - Create school
- `GET /api/schools` - List all schools
- `GET /api/schools/:id` - Get school by ID
- `PUT /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school
- `POST /api/schools/:id/admin` - Create school admin
- `GET /api/schools/:id/admins` - List school admins

### Classrooms (RBAC Enforced)
- `POST /api/classrooms` - Create classroom
- `GET /api/classrooms` - List classrooms
- `GET /api/classrooms/:id` - Get classroom
- `PUT /api/classrooms/:id` - Update classroom
- `DELETE /api/classrooms/:id` - Delete classroom
- `GET /api/classrooms/:id/students` - Get classroom students

### Students (RBAC Enforced)
- `POST /api/students` - Enroll student
- `GET /api/students` - List students
- `GET /api/students/:id` - Get student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `PUT /api/students/:id/transfer` - Transfer student
- `GET /api/students/stats` - Get statistics

## RBAC Rules

| Role | Schools | Classrooms | Students |
|------|---------|------------|----------|
| SUPERADMIN | Full CRUD | Full CRUD (any school) | Full CRUD (any school) |
| SCHOOL_ADMIN | No access | CRUD (own school only) | CRUD (own school only) |

## Getting Started

1. **Setup MongoDB and Redis**
   ```bash
   # Start MongoDB
   mongod
   
   # Start Redis
   redis-server
   ```

2. **Create Initial Superadmin**
   ```bash
   curl -X POST http://localhost:5000/api/auth/setup \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Super Admin",
       "email": "admin@school.com",
       "password": "SecurePass123",
       "setupSecret": "initial-setup-secret-key"
     }'
   ```

3. **Login**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@school.com",
       "password": "SecurePass123"
     }'
   ```

4. **Create a School** (use the token from login)
   ```bash
   curl -X POST http://localhost:5000/api/schools \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "name": "Springfield High School",
       "contactEmail": "info@springfield.edu"
     }'
   ```

## License

ISC
