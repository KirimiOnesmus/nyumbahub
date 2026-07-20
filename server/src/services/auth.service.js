'use strict';

const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_MINUTES, ACTIVITY_ACTION } = require('../config/constants');
const {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
  revokeToken,
} = require('./token.service');
const auditLogService = require('./auditLog.service');


async function login({ phone, password, ip, userAgent }) {
  const user = await User.findOne({ phone }).select(
    '+passwordHash +failedLoginAttempts +lockedUntil'
  );

  const genericFail = () => AppError.unauthorized('Invalid phone number or password');

  if (!user || !user.isActive) {
    throw genericFail();
  }

  if (user.isLocked()) {
    logger.warn({ userId: user._id.toString() }, 'Login attempt on locked account');
    throw AppError.unauthorized(
      `Account temporarily locked. Try again after ${LOGIN_LOCKOUT_MINUTES} minutes.`
    );
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
      logger.warn({ userId: user._id.toString() }, 'Account locked after repeated failed logins');
    }
    await user.save();
    throw genericFail();
  }

  // Successful login: reset lockout counters, issue a fresh token pair.
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  const accessToken = signAccessToken(user);
  const { raw: refreshToken } = await issueRefreshToken(user, { ip, userAgent });

  logger.info({ userId: user._id.toString() }, 'Login success');
  await auditLogService.recordEvent({
    actor: { id: user._id.toString(), name: user.name, role: user.role },
    action: ACTIVITY_ACTION.LOGIN,
    description: `${user.name} logged in`,
  });

  return {
    accessToken,
    refreshToken,
    user: user.toJSON(),
  };
}

async function getMe({ userId }) {
 
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Account not found or deactivated');
  }
  return user.toJSON();
}


async function updateMe({ userId, updates }) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Account not found or deactivated');
  }

  Object.assign(user, updates);
  await user.save();

  logger.info({ userId: user._id.toString(), fields: Object.keys(updates) }, 'Profile updated');
  return user.toJSON();
}

async function refresh({ refreshToken, ip, userAgent }) {
  if (!refreshToken) throw AppError.unauthorized('Missing refresh token');

  let existing;
  try {
    existing = await rotateRefreshToken(refreshToken, { ip, userAgent });
  } catch (err) {
    if (err.message === 'REFRESH_TOKEN_REUSE_DETECTED') {
      logger.error(
        { userAgent, ip },
        'Refresh token reuse detected — entire token family revoked'
      );
    }
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(existing.userId);
  if (!user || !user.isActive) throw AppError.unauthorized('Account not found or deactivated');

  const accessToken = signAccessToken(user);
  const { raw: newRefreshToken } = await issueRefreshToken(user, {
    family: existing.family,
    replacesTokenId: existing._id,
    ip,
    userAgent,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

async function logout({ refreshToken, userId, allDevices }) {
  if (allDevices) {
    await revokeAllUserTokens(userId);
    return;
  }
  if (refreshToken) {
    await revokeToken(refreshToken);
  }
}

module.exports = { login, refresh, logout, getMe, updateMe };