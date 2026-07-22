'use strict';
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');
const { revokeAllUserTokens } = require('./token.service');
const { trustedOp } = require('../utils/mongoSafe');
const { PASSWORD_RESET_TOKEN_BYTES, PASSWORD_RESET_EXPIRY_MINUTES, ACTIVITY_ACTION } = require('../config/constants');
const auditLogService = require('./auditLog.service');
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}


async function requestPasswordReset(phone) {
  const user = await User.findOne({ phone });
  if (!user || !user.isActive) {
    logger.info({ phone }, 'Password reset requested for unknown/inactive account — no-op');
    return; 
  }

  const rawToken = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
  await user.save();

  try {
    await notificationService.sendPasswordResetToken(phone, rawToken);
  } catch (err) {

    logger.error({ userId: user._id.toString(), err: err.message }, 'Password reset delivery failed');
  }
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: trustedOp({ $gt: new Date() }),
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) {
    throw AppError.badRequest('This reset link is invalid or has expired');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();


  await revokeAllUserTokens(user._id);

  logger.info({ userId: user._id.toString() }, 'Password reset completed, all sessions revoked');
  await auditLogService.recordEvent({
    actor: { id: user._id.toString(), name: user.name, role: user.role },
    action: ACTIVITY_ACTION.PASSWORD_RESET,
    description: `${user.name} reset their own password via the forgot-password link`,
  });
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw AppError.notFound('User not found');

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw AppError.badRequest('Current password is incorrect');

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();


  await revokeAllUserTokens(user._id);

  logger.info({ userId: user._id.toString() }, 'Password changed, all sessions revoked');
  await auditLogService.recordEvent({
    actor: { id: user._id.toString(), name: user.name, role: user.role },
    action: ACTIVITY_ACTION.PASSWORD_CHANGE,
    description: `${user.name} changed their own password`,
  });
}

module.exports = { requestPasswordReset, resetPassword, changePassword };