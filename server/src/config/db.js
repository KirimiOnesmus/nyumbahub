'use strict';
const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('sanitizeFilter', true);

mongoose.set('strictQuery', true);

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  mongoose.connection.on('error', (err) => {
    logger.error({ err: err.message }, 'MongoDB connection error');
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    isConnected = false;
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
    isConnected = true;
  });

  await mongoose.connect(env.MONGO_URI, {
    
    autoIndex: env.NODE_ENV !== 'production',
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
  });

  isConnected = true;
  logger.info('MongoDB connected');
  return mongoose.connection;
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected cleanly');
}

module.exports = { connectDB, disconnectDB, mongoose };