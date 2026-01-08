const Redis = require('ioredis');
const config = require('./index');

let redisClient = null;

const createRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(config.REDIS_URI, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('❌ Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
  });

  redisClient.on('connect', () => {
    console.log('🔴 Redis Client Connected');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err.message);
  });

  redisClient.on('end', () => {
    console.log('🔴 Redis Client Disconnected');
  });

  return redisClient;
};

const getRedisClient = () => {
  if (!redisClient) {
    return createRedisClient();
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

module.exports = {
  createRedisClient,
  getRedisClient,
  disconnectRedis,
};
