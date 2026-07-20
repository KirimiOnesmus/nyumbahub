'use strict';

const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');

let server;

async function start() {
  await connectDB();

  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  });

 
  server.keepAliveTimeout = 65000;
}

async function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received, closing gracefully');
  if (server) {
  
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection — shutting down');
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'Uncaught exception — shutting down');
  process.exit(1);
});

start().catch((err) => {
  logger.error({ err: err.message }, 'Failed to start server');
  process.exit(1);
});