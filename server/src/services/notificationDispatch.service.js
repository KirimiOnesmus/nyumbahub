'use strict';

const TenantProfile = require('../models/TenantProfile');
const User = require('../models/User');
const NotificationLog = require('../models/NotificationLog');
const { NOTIFICATION_STATUS } = require('../config/constants');

async function hasAlreadyNotified(tenantId, billId, messageType) {
  // Only a successful (or already-in-flight-successful) send should suppress
  // a future attempt. A prior FAILED attempt must NOT count as "already
  // notified" — otherwise a permanently-failed bill notification could
  // never be retried, since this same tenantId+billId+messageType would
  // always match the existing failed log entry.
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
  // findOneAndUpdate + upsert, not create(): the unique index on
  // {tenantId, billId, messageType} means a second attempt (e.g. after
  // hasAlreadyNotified correctly allows a retry past a prior FAILED
  // result) would otherwise hit a duplicate-key error on create() and be
  // silently dropped, leaving the log frozen on stale data even if the
  // retry succeeds.
  const update = {
    $set: {
      status: result.status,
      attempts: result.attempts,
      lastError: result.lastError,
      sentAt: result.status === NOTIFICATION_STATUS.SENT ? new Date() : null,
    },
  };

  // waMessageId has its own unique+sparse index. Sparse indexes only skip
  // documents where the field is genuinely MISSING — an explicit `null` is
  // still indexed, so setting `null` on every failed send collides across
  // *different* tenants/bills the moment a second one fails. $unset instead
  // of $set-to-null keeps the field truly absent so sparse correctly
  // excludes it.
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