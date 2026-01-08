const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const schoolRoutes = require('./school.routes');
const classroomRoutes = require('./classroom.routes');
const studentRoutes = require('./student.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/schools', schoolRoutes);
router.use('/classrooms', classroomRoutes);
router.use('/students', studentRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'School Management System API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
