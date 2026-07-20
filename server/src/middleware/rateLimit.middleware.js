'use strict';

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const AppError = require('../utils/AppError');

function handler(req, res, next) {
  next(AppError.tooManyRequests('Too many requests, please try again later'));
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.body?.phone || 'unknown'}`,
  handler,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.body?.phone || 'unknown'}`,
  handler,
});

const stkPushLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}`,
  handler,
});

const ownerInviteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler,
});

const inviteLinkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler,
});

const billPaymentLinkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler,
});


const paymentStatusLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler,
});


const announcementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}`,
  handler,
});

const expenseCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}`,
  handler,
});

const credentialsResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5, // matches CREDENTIALS_RESEND_MAX_PER_HOUR in config/constants.js
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}:${req.params?.id || ''}`,
  handler,
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  stkPushLimiter,
  ownerInviteLimiter,
  inviteLinkLimiter,
  billPaymentLinkLimiter,
  paymentStatusLimiter,
  announcementLimiter,
  expenseCreateLimiter,
  credentialsResendLimiter,
  globalLimiter,
};