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

## Connection Architecture

The application uses a modular connection setup:

- **MongoDB**: Connected via `connect/mongo.js` - automatically handles connection lifecycle
- **Redis**: Connected via `cache/redis-client.js` - used for caching and rate limiting
- **Configuration**: Managed through `config/index.config.js` - reads from environment variables

Both connections are initialized automatically when the server starts using the existing connection modules.

## Project Structure

```
├── config/           # Configuration files
│   ├── index.config.js  # Environment configuration
│   └── envs/         # Environment-specific configs
├── connect/          # Database connections
│   └── mongo.js      # MongoDB connection setup
├── cache/            # Cache/Redis setup
│   ├── redis-client.js  # Redis client creation
│   └── cache.dbh.js  # Cache database handler
├── src/              # Application source code
│   ├── config/       # App configuration
│   │   └── swagger.js # Swagger documentation config
│   ├── controllers/  # Request handlers
│   ├── middleware/   # Express middleware
│   │   ├── auth.middleware.js     # JWT authentication
│   │   ├── rbac.middleware.js     # Role-based access control
│   │   ├── scope.middleware.js    # School-based scoping
│   │   ├── rateLimiter.middleware.js  # Redis rate limiting
│   │   └── errorHandler.middleware.js # Error handling
│   ├── models/       # Mongoose models
│   ├── routes/       # API routes with Swagger docs
│   ├── services/     # Business logic
│   ├── validators/   # Joi validation schemas
│   └── server.js     # Application entry point
└── tests/            # Test files
    ├── setup.js      # Jest setup
    ├── helpers/      # Test utilities
    ├── auth.test.js  # Authentication tests
    ├── rbac.test.js  # RBAC tests
    └── integration.test.js # Integration tests
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Service Configuration
SERVICE_NAME=school-management-system
ENV=development
USER_PORT=5000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/school-management-system

# Redis Configuration (used for cache and rate limiting)
REDIS_URI=redis://127.0.0.1:6379
CACHE_REDIS=redis://127.0.0.1:6379
CACHE_PREFIX=school-management:ch

# JWT Configuration
LONG_TOKEN_SECRET=your-long-token-secret-change-in-production
SHORT_TOKEN_SECRET=your-short-token-secret-change-in-production
NACL_SECRET=your-nacl-secret-change-in-production

# Security & RBAC
SETUP_SECRET=initial-setup-secret-change-in-production
BCRYPT_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=*
```

**Note**: The application uses the existing connection setup from `connect/mongo.js` for MongoDB and `cache/redis-client.js` for Redis. These connections are initialized automatically when the server starts.

## Installation

### Option 1: Docker Compose (Recommended)

The easiest way to run the entire stack (API + MongoDB + Redis):

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f app

# Stop all services
docker compose down

# Stop and remove volumes (clean reset)
docker compose down -v
```

Services will be available at:

- **API**: http://localhost:5000
- **Swagger Docs**: http://localhost:5000/api-docs
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Option 2: Local Development

**Prerequisites**: Make sure MongoDB and Redis are running locally

```bash
# Install dependencies
npm install

# Start development server (uses index.js with existing connection setup)
npm run dev

# Or start the new API server (uses src/server.js)
node src/server.js

# Run tests
npm test
```

**Connection Setup**: 
- MongoDB connection is handled by `connect/mongo.js` - automatically connects using `MONGO_URI`
- Redis connection is handled by `cache/redis-client.js` - automatically connects using `CACHE_REDIS` or `REDIS_URI`

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

| Role         | Schools   | Classrooms             | Students               |
| ------------ | --------- | ---------------------- | ---------------------- |
| SUPERADMIN   | Full CRUD | Full CRUD (any school) | Full CRUD (any school) |
| SCHOOL_ADMIN | No access | CRUD (own school only) | CRUD (own school only) |

## Getting Started

### Using Docker Compose

```bash
# Start all services (MongoDB, Redis, and API)
docker compose up -d

# Wait for services to be healthy (check with: docker compose ps)
# Then create superadmin
curl -X POST http://localhost:5000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@school.com",
    "password": "SecurePass123",
    "setupSecret": "initial-setup-secret-key"
  }'
```

**Note**: Docker Compose automatically sets the environment variables for MongoDB and Redis connections. The application uses the existing connection methods from `connect/mongo.js` and `cache/redis-client.js`.

### Manual Setup

1. **Setup MongoDB and Redis**

   ```bash
   # Start MongoDB
   mongod

   # Start Redis
   redis-server
   ```

2. **Configure Environment Variables**

   Create a `.env` file with the connection details (see Environment Variables section above).

3. **Create Initial Superadmin**

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
