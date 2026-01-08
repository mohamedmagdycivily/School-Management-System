const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const { connectDB } = require('./config/database');
const { createRedisClient } = require('./config/redis');
const routes = require('./routes');
const swaggerSpecs = require('./config/swagger');
const { notFoundHandler, errorHandler, apiLimiter } = require('./middleware');

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'School Management System API Docs',
}));

// Rate limiting (applies to all /api routes)
app.use('/api', apiLimiter);

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to School Management System API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/api/health',
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Server startup function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Redis client
    createRedisClient();

    // Start server
    const server = app.listen(config.PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏫 School Management System API                              ║
║                                                               ║
║   Environment: ${config.NODE_ENV.padEnd(42)}║
║   Port: ${config.PORT.toString().padEnd(50)}║
║   API Docs: http://localhost:${config.PORT}/api-docs${' '.repeat(26)}║
║   Health: http://localhost:${config.PORT}/api/health${' '.repeat(25)}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Close database connections
        const { disconnectDB } = require('./config/database');
        const { disconnectRedis } = require('./config/redis');
        
        await disconnectDB();
        await disconnectRedis();
        
        console.log('All connections closed. Goodbye! 👋');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

// Export for testing
module.exports = app;
