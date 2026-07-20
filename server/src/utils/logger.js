'use strict';

const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),

  redact: {
    paths: [
      'password',
      'passwordHash',
      'newPassword',
      'currentPassword',
      'req.body.password',
      'req.body.passwordHash',
      'req.body.newPassword',
      'req.body.currentPassword',
      'req.body.otp',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'accessToken',
      'refreshToken',
      'token',
      'idNumber',
      '*.passwordHash',
      '*.accessToken',
      '*.refreshToken',
      '*.tokenHash',
      '*.mpesaConsumerSecret',
      '*.whatsappToken',
      '*.mfaSecretEncrypted',
    ],
    censor: '[REDACTED]',
  },

  formatters: {
    level(label) {
      return { level: label };
    },
  },

  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;