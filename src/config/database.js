const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI);
    console.log(`💾 MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('💾 MongoDB Disconnected');
  } catch (error) {
    console.error(`❌ MongoDB Disconnection Error: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
