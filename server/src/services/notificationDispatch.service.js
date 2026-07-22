'use strict';

const TenantProfile = require('../models/TenantProfile');
const User = require('../models/User');
const NotificationLog = require('../models/NotificationLog');
const { NOTIFICATION_STATUS } = require('../config/constants');

async function hasAlreadyNotified(tenantId, billId, messageType) {

  const existing = await NotificationLog.findOne({
    tenantId,
    billId,
    messageType,
    status: NOTIFICATION_STATUS.SENT,
  });
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

  const update = {
    $set: {
      status: result.status,
      attempts: result.attempts,
      lastError: result.lastError,
      sentAt: result.status === NOTIFICATION_STATUS.SENT ? new Date() : null,
    },
  };


  if (result.waMessageId) {
    update.$set.waMessageId = result.waMessageId;
  } else {
    update.$unset = { waMessageId: '' };
  }

  await NotificationLog.findOneAndUpdate(
    { tenantId, billId, messageType },
    update,
    { upsert: true, setDefaultsOnInsert: true }
  );
}

module.exports = { hasAlreadyNotified, resolveTenantContact, recordNotificationResult };