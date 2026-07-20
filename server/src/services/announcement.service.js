'use strict';
const Announcement = require('../models/Announcement');
const TenantProfile = require('../models/TenantProfile');
const Unit = require('../models/Unit');
const AppError = require('../utils/AppError');
const { loadScopedBuilding } = require('../middleware/buildingScope.middleware');
const { trustedIn } = require('../utils/mongoSafe');
const notificationService = require('./notification.service');
const { TENANT_STATUS, NOTIFICATION_STATUS } = require('../config/constants');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;


async function resolveActiveRecipients(buildingId) {
  const units = await Unit.find({ buildingId, isArchived: false }).select('_id').lean();
  const unitIds = units.map((u) => u._id);

  const profiles = await TenantProfile.find({
    unitId: trustedIn(unitIds),
    status: TENANT_STATUS.ACTIVE,
  })
    .populate('userId', 'phone')
    .lean();

  return profiles.filter((p) => p.userId?.phone).map((p) => p.userId.phone);
}


async function createAndSendAnnouncement(req, buildingId, message) {
  const building = await loadScopedBuilding(req, buildingId);
  const recipients = await resolveActiveRecipients(building._id);

  const results = await Promise.all(
    recipients.map((phone) => notificationService.sendAnnouncementWithRetry(phone, message))
  );

  const successCount = results.filter((r) => r.status === NOTIFICATION_STATUS.SENT).length;
  const failureCount = results.length - successCount;

  const announcement = await Announcement.create({
    buildingId: building._id,
    message,
    sentBy: req.user.id,
    recipientCount: recipients.length,
    successCount,
    failureCount,
  });

  return announcement.toJSON();
}


async function sendDirectAnnouncement(req, buildingId, tenantId, message) {
  const building = await loadScopedBuilding(req, buildingId);

  const profile = await TenantProfile.findOne({ _id: tenantId, status: TENANT_STATUS.ACTIVE })
    .populate('userId', 'phone')
    .populate('unitId', 'buildingId');

  const belongsToBuilding =
    profile && profile.unitId && profile.unitId.buildingId.toString() === building._id.toString();

  if (!belongsToBuilding) {
    throw AppError.notFound('Tenant not found in this building.');
  }

  const phone = profile.userId?.phone;
  if (!phone) {
    throw AppError.conflict('This tenant has no phone number on file.');
  }

  const result = await notificationService.sendAnnouncementWithRetry(phone, message);
  const success = result.status === NOTIFICATION_STATUS.SENT;

  const announcement = await Announcement.create({
    buildingId: building._id,
    tenantId: profile._id,
    message,
    sentBy: req.user.id,
    recipientCount: 1,
    successCount: success ? 1 : 0,
    failureCount: success ? 0 : 1,
  });

  return announcement.toJSON();
}


async function listAnnouncements(req, buildingId, { page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const building = await loadScopedBuilding(req, buildingId);

  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
  const skip = (page - 1) * safeLimit;

  const [announcements, total] = await Promise.all([
    Announcement.find({ buildingId: building._id })
      .populate('sentBy', 'name role')
      .populate({ path: 'tenantId', select: 'userId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Announcement.countDocuments({ buildingId: building._id }),
  ]);

  return {
    announcements,
    pagination: { page, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

module.exports = { createAndSendAnnouncement, sendDirectAnnouncement, listAnnouncements };