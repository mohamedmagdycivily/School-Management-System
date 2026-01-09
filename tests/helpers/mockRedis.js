/**
 * Mock Redis Client
 * Used for testing without actual Redis connection
 */

const mockStore = new Map();

const mockRedisClient = {
  get: jest.fn((key) => Promise.resolve(mockStore.get(key) || null)),
  set: jest.fn((key, value, options) => {
    mockStore.set(key, value);
    return Promise.resolve('OK');
  }),
  del: jest.fn((key) => {
    mockStore.delete(key);
    return Promise.resolve(1);
  }),
  incr: jest.fn((key) => {
    const current = parseInt(mockStore.get(key) || '0', 10);
    const newValue = current + 1;
    mockStore.set(key, newValue.toString());
    return Promise.resolve(newValue);
  }),
  expire: jest.fn(() => Promise.resolve(1)),
  ttl: jest.fn(() => Promise.resolve(-1)),
  keys: jest.fn(() => Promise.resolve(Array.from(mockStore.keys()))),
  flushall: jest.fn(() => {
    mockStore.clear();
    return Promise.resolve('OK');
  }),
  quit: jest.fn(() => Promise.resolve('OK')),
  disconnect: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(() => Promise.resolve()),
};

/**
 * Clear the mock store between tests
 */
function clearMockStore() {
  mockStore.clear();
}

/**
 * Get the current mock store contents
 */
function getMockStore() {
  return Object.fromEntries(mockStore);
}

module.exports = {
  mockRedisClient,
  clearMockStore,
  getMockStore,
};
