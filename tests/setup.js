const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Increase timeout for tests
jest.setTimeout(30000);

// Setup before all tests
beforeAll(async () => {
  // Create in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after each test (skip for integration tests which need data persistence)
afterEach(async () => {
  // Skip cleanup for integration tests - they manage their own cleanup
  const testPath = expect.getState().testPath || '';
  if (testPath.includes('integration.test.js')) {
    return;
  }
  
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Close mongoose connection
  await mongoose.connection.close();
  
  // Stop in-memory MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
