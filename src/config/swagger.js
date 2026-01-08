const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management System API',
      version: '1.0.0',
      description: `
## Production-Grade School Management System API

This API provides comprehensive management functionality for schools, classrooms, and students.

### Features
- **Authentication**: JWT-based authentication with secure login
- **Role-Based Access Control (RBAC)**:
  - **SUPERADMIN**: Full system access - can manage all schools, classrooms, and students
  - **SCHOOL_ADMIN**: Scoped access - can only manage resources within their assigned school
- **Rate Limiting**: Redis-backed rate limiting for API protection
- **Input Validation**: Strict Joi validation on all write operations

### Getting Started
1. Use \`POST /api/auth/setup\` to create the initial superadmin account
2. Login with \`POST /api/auth/login\` to get your JWT token
3. Use the token in the Authorization header: \`Bearer <token>\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@school.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: 'Authentication required. Please provide a valid token.',
                  },
                  code: {
                    type: 'string',
                    example: 'AUTH_TOKEN_REQUIRED',
                  },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Access denied - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: 'Access denied. Required roles: SUPERADMIN',
                  },
                  code: {
                    type: 'string',
                    example: 'RBAC_PERMISSION_DENIED',
                  },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: 'Validation failed',
                  },
                  code: {
                    type: 'string',
                    example: 'VALIDATION_ERROR',
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                        },
                        message: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: 'Resource not found',
                  },
                  code: {
                    type: 'string',
                    example: 'NOT_FOUND',
                  },
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: 'Too many requests. Please try again later.',
                  },
                  code: {
                    type: 'string',
                    example: 'RATE_LIMIT_EXCEEDED',
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Schools',
        description: 'School management endpoints (Superadmin only)',
      },
      {
        name: 'Classrooms',
        description: 'Classroom management endpoints (RBAC enforced)',
      },
      {
        name: 'Students',
        description: 'Student management endpoints (RBAC enforced)',
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
