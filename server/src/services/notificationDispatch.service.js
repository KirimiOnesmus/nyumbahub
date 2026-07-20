'use strict';

const TenantProfile = require('../models/TenantProfile');
const User = require('../models/User');
const NotificationLog = require('../models/NotificationLog');
const { NOTIFICATION_STATUS } = require('../config/constants');

async function hasAlreadyNotified(tenantId, billId, messageType) {
  const existing = await NotificationLog.findOne({ tenantId, billId, messageType });
  return Boolean(existing);
}

async function resolveTenantContact(tenantId) {
  const tenantProfile = await TenantProfile.findById(tenantId).select('userId');
  if (!tenantProfile) return null;

  const user = await User.findById(tenantProfile.userId).select('phone name');
  if (!user) return null;

  return { phone: user.phone, name: user.name };
}

async function recordNotificationResult({ tenantId, billId, messageType, result }) {
  try {
    await NotificationLog.create({
      tenantId,
      billId,
      messageType,
      status: result.status,
      attempts: result.attempts,
      lastError: result.lastError,
      sentAt: result.status === NOTIFICATION_STATUS.SENT ? new Date() : null,
      waMessageId: result.waMessageId || null,
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
}

module.exports = { hasAlreadyNotified, resolveTenantContact, recordNotificationResult };