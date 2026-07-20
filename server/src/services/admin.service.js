'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const Building = require('../models/Building');
const Unit = require('../models/Unit');
const TenantProfile = require('../models/TenantProfile');
const CaretakerAssignment = require('../models/CaretakerAssignment');
const RefreshToken = require('../models/RefreshToken');
const SystemConfig = require('../models/SystemConfig');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const env = require('../config/env');
const { ROLES, ACTIVITY_ACTION, TENANT_STATUS } = require('../config/constants');
const { generateTempPassword } = require('../utils/tempPassword');
const { revokeAllUserTokens } = require('./token.service');
const { areJobsRunning } = require('../jobs/scheduler');
const auditLogService = require('./auditLog.service');
const { trustedIn, trustedOp } = require('../utils/mongoSafe');

// Admin can only reach into owner/caretaker accounts this way — never other
// admins, and never tenants (tenants aren't admin-managed at all, per the
// rest of this app; see owner/caretaker routes for the boundary).
const ADMIN_MANAGEABLE_ROLES = [ROLES.OWNER, ROLES.CARETAKER];

async function getOverview() {
  const [totalOwners, activeOwners, totalCaretakers, activeCaretakers, totalBuildings, totalTenants] =
    await Promise.all([
      User.countDocuments({ role: ROLES.OWNER }),
      User.countDocuments({ role: ROLES.OWNER, isActive: true }),
      User.countDocuments({ role: ROLES.CARETAKER }),
      User.countDocuments({ role: ROLES.CARETAKER, isActive: true }),
      Building.countDocuments({ isArchived: false }),
      TenantProfile.countDocuments(),
    ]);

  return { totalOwners, activeOwners, totalCaretakers, activeCaretakers, totalBuildings, totalTenants };
}

async function getOrCreateSystemConfig() {
  let config = await SystemConfig.findOne();
  if (!config) {
    config = await SystemConfig.create({});
  }
  return config;
}

async function getSystemConfig() {
  const config = await getOrCreateSystemConfig();
  return config.toJSON();
}

async function updateSystemConfig(payload, adminUser) {
  const config = await getOrCreateSystemConfig();

  const fields = ['supportPhone', 'supportEmail', 'smsSenderId'];
  const changedFields = [];
  for (const field of fields) {
    if (payload[field] !== undefined && payload[field] !== config[field]) {
      config[field] = payload[field];
      changedFields.push(field);
    }
  }
  config.updatedBy = adminUser.id;
  await config.save();

  if (changedFields.length > 0) {
    logger.info({ adminId: adminUser.id, changedFields }, 'System config updated');
    await auditLogService.recordEvent({
      actor: adminUser,
      action: ACTIVITY_ACTION.CONFIG_UPDATE,
      description: `updated platform configuration (${changedFields.join(', ')})`,
      metadata: { fields: changedFields },
    });
  }

  return config.toJSON();
}

async function changeUserPhone(userId, phone, adminUser) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  if (!ADMIN_MANAGEABLE_ROLES.includes(user.role)) {
    throw AppError.forbidden('Phone number can only be changed for owner or caretaker accounts');
  }

  const existing = await User.findOne({ phone, _id: trustedOp({ $ne: user._id }) }).lean();
  if (existing) throw AppError.conflict('A user with this phone number already exists');

  const previousPhone = user.phone;
  user.phone = phone;
  await user.save();

  // Login identifier changed — any existing session was authenticated
  // against the old identity, so force re-authentication everywhere.
  await revokeAllUserTokens(user._id);

  logger.info(
    { userId: user._id.toString(), adminId: adminUser.id },
    'User phone number changed by admin'
  );
  await auditLogService.recordEvent({
    actor: adminUser,
    action: ACTIVITY_ACTION.PHONE_CHANGE,
    target: user.name,
    targetId: user._id,
    description: `changed the phone number for ${user.name}`,
    metadata: { previousPhoneLast4: previousPhone.slice(-4) },
  });

  return user.toJSON();
}

async function resetUserPassword(userId, adminUser) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  if (!ADMIN_MANAGEABLE_ROLES.includes(user.role)) {
    throw AppError.forbidden('Password can only be reset for owner or caretaker accounts');
  }

  const temporaryPassword = generateTempPassword();
  user.passwordHash = await User.hashPassword(temporaryPassword);
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  // Same reasoning as every other password change in this app: invalidate
  // every existing session once the credential changes.
  await revokeAllUserTokens(user._id);

  logger.info(
    { userId: user._id.toString(), adminId: adminUser.id },
    'User password reset by admin'
  );
  await auditLogService.recordEvent({
    actor: adminUser,
    action: ACTIVITY_ACTION.PASSWORD_RESET,
    target: user.name,
    targetId: user._id,
    description: `reset the password for ${user.name}`,
  });

  return { temporaryPassword };
}

/** Caretaker deletion is always a hard delete — the account and every
 *  building assignment it holds are removed entirely. Used both for a
 *  direct admin delete of a caretaker, and as part of an owner's cascade. */
async function deleteCaretakerAccount(caretaker, session) {
  await CaretakerAssignment.deleteMany({ caretakerId: caretaker._id }).session(session);
  await RefreshToken.deleteMany({ userId: caretaker._id }).session(session);
  await User.deleteOne({ _id: caretaker._id }).session(session);
}

/** Deleting an owner cascades through everything they own:
 *  - buildings and units are hard-deleted (structural, no life outside the owner)
 *  - caretakers assigned to those buildings are hard-deleted entirely
 *  - tenants in those units are soft-archived (moved_out + deactivated), not
 *    deleted, so their bills/payments/notification history stays intact
 *  - bills, payments, expenses, announcements, notification logs are left
 *    untouched as historical/audit records */
async function deleteOwnerCascade(owner, adminUser) {
  const buildings = await Building.find({ ownerId: owner._id }).select('_id').lean();
  const buildingIds = buildings.map((b) => b._id);

  let deletedCaretakerCount = 0;
  let deletedUnitCount = 0;
  let archivedTenantCount = 0;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (buildingIds.length > 0) {
        // Caretakers assigned to these buildings — deleted entirely.
        const assignments = await CaretakerAssignment.find({ buildingId: trustedIn(buildingIds) })
          .select('caretakerId')
          .session(session);
        const caretakerIds = [...new Set(assignments.map((a) => a.caretakerId.toString()))];

        if (caretakerIds.length > 0) {
          await CaretakerAssignment.deleteMany({ caretakerId: trustedIn(caretakerIds) }).session(session);
          await RefreshToken.deleteMany({ userId: trustedIn(caretakerIds) }).session(session);
          const result = await User.deleteMany({
            _id: trustedIn(caretakerIds),
            role: ROLES.CARETAKER,
          }).session(session);
          deletedCaretakerCount = result.deletedCount;
        }
        // Catch any assignments left pointing at these buildings regardless of caretaker.
        await CaretakerAssignment.deleteMany({ buildingId: trustedIn(buildingIds) }).session(session);

        // Units + tenants under these buildings.
        const units = await Unit.find({ buildingId: trustedIn(buildingIds) }).select('_id').session(session);
        const unitIds = units.map((u) => u._id);
        deletedUnitCount = unitIds.length;

        if (unitIds.length > 0) {
          const tenantProfiles = await TenantProfile.find({
            unitId: trustedIn(unitIds),
            status: trustedOp({ $ne: TENANT_STATUS.MOVED_OUT }),
          })
            .select('_id userId')
            .session(session);

          if (tenantProfiles.length > 0) {
            const tenantProfileIds = tenantProfiles.map((t) => t._id);
            const tenantUserIds = [...new Set(tenantProfiles.map((t) => t.userId.toString()))];

            // Soft-archive: keep the tenant record and their financial
            // history, just mark them moved out and deactivate login.
            await TenantProfile.updateMany(
              { _id: trustedIn(tenantProfileIds) },
              { $set: { status: TENANT_STATUS.MOVED_OUT, moveOutDate: new Date() } }
            ).session(session);

            await User.updateMany(
              { _id: trustedIn(tenantUserIds), role: ROLES.TENANT },
              { $set: { isActive: false } }
            ).session(session);

            await RefreshToken.deleteMany({ userId: trustedIn(tenantUserIds) }).session(session);
            archivedTenantCount = tenantProfileIds.length;
          }

          await Unit.deleteMany({ _id: trustedIn(unitIds) }).session(session);
        }

        await Building.deleteMany({ _id: trustedIn(buildingIds) }).session(session);
      }

      await RefreshToken.deleteMany({ userId: owner._id }).session(session);
      await User.deleteOne({ _id: owner._id }).session(session);
    });
  } finally {
    await session.endSession();
  }

  const cascade = {
    buildingsDeleted: buildingIds.length,
    unitsDeleted: deletedUnitCount,
    caretakersDeleted: deletedCaretakerCount,
    tenantsArchived: archivedTenantCount,
  };

  logger.info(
    { ownerId: owner._id.toString(), adminId: adminUser.id, ...cascade },
    'Owner deleted by admin, cascade complete'
  );

  await auditLogService.recordEvent({
    actor: adminUser,
    action: ACTIVITY_ACTION.USER_DELETED,
    target: owner.name,
    targetId: owner._id,
    description: `deleted owner account for ${owner.name} (${cascade.buildingsDeleted} building(s), ${cascade.caretakersDeleted} caretaker(s), ${cascade.tenantsArchived} tenant(s) archived)`,
    metadata: cascade,
  });

  return { deleted: true, role: ROLES.OWNER, cascade };
}

/** Admin deletes an owner or caretaker account. Owners cascade through their
 *  buildings (see deleteOwnerCascade); caretakers are simply removed along
 *  with their building assignments. */
async function deleteUser(userId, adminUser) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  if (!ADMIN_MANAGEABLE_ROLES.includes(user.role)) {
    throw AppError.forbidden('Only owner or caretaker accounts can be deleted');
  }

  if (user.role === ROLES.OWNER) {
    return deleteOwnerCascade(user, adminUser);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await deleteCaretakerAccount(user, session);
    });
  } finally {
    await session.endSession();
  }

  logger.info({ caretakerId: user._id.toString(), adminId: adminUser.id }, 'Caretaker deleted by admin');
  await auditLogService.recordEvent({
    actor: adminUser,
    action: ACTIVITY_ACTION.USER_DELETED,
    target: user.name,
    targetId: user._id,
    description: `deleted caretaker account for ${user.name}`,
  });

  return { deleted: true, role: ROLES.CARETAKER };
}

async function measureDbLatencyMs() {
  if (mongoose.connection.readyState !== 1) return null;
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().command({ ping: 1 });
    return Date.now() - start;
  } catch {
    return null;
  }
}

// DB status is a live check. WhatsApp/M-Pesa are reported from validated
// env config only (env.js already refuses to boot without them) — this
// intentionally does NOT make a live call to either third-party API on
// every health poll, to avoid burning real quota/rate limits against
// production credentials just to paint a dashboard.
async function getSystemHealth() {
  const now = new Date();
  const dbLatencyMs = await measureDbLatencyMs();
  const dbStatus =
    mongoose.connection.readyState === 1 ? 'operational' : mongoose.connection.readyState === 2 ? 'degraded' : 'down';

  const smsConfigured = Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);

  const services = [
    {
      name: 'api',
      label: 'API Server',
      status: 'operational',
      latencyMs: 0,
      lastCheckedAt: now,
    },
    {
      name: 'database',
      label: 'Database',
      status: dbStatus,
      latencyMs: dbLatencyMs,
      lastCheckedAt: now,
    },
    {
      name: 'sms',
      label: 'WhatsApp Messaging',
      status: smsConfigured ? 'operational' : 'down',
      latencyMs: null,
      lastCheckedAt: now,
    },
    {
      name: 'jobs',
      label: 'Scheduled Jobs',
      status: areJobsRunning() ? 'operational' : 'down',
      latencyMs: null,
      lastCheckedAt: now,
    },
  ];

  return { services, uptime: process.uptime() };
}

async function getActivityLog(query) {
  return auditLogService.listActivity(query);
}

module.exports = {
  getOverview,
  getSystemConfig,
  updateSystemConfig,
  changeUserPhone,
  resetUserPassword,
  deleteUser,
  getSystemHealth,
  getActivityLog,
};
