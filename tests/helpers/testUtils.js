/**
 * Test Utilities
 * Helper functions for testing
 */
const mongoose = require('mongoose');

/**
 * Clear all collections in the database
 */
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
}

/**
 * Drop all collections
 */
async function dropCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    try {
      await collections[key].drop();
    } catch (error) {
      // Collection might not exist
    }
  }
}

/**
 * Create mock auth context for SUPERADMIN
 */
function createSuperadminAuth(userId) {
  return {
    __auth: {
      userId: userId.toString(),
      role: 'SUPERADMIN',
      schoolId: null,
    },
    __superadmin: true,
  };
}

/**
 * Create mock auth context for SCHOOL_ADMIN
 */
function createSchoolAdminAuth(userId, schoolId) {
  return {
    __auth: {
      userId: userId.toString(),
      role: 'SCHOOL_ADMIN',
      schoolId: schoolId.toString(),
    },
    __schoolAdmin: true,
    __schoolScope: {
      schoolId: schoolId.toString(),
      isSuperadmin: false,
    },
  };
}

/**
 * Wait for a specified amount of time
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  clearDatabase,
  closeDatabase,
  dropCollections,
  createSuperadminAuth,
  createSchoolAdminAuth,
  wait,
};
