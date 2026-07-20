'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const Unit = require('../models/Unit');
const TenantProfile = require('../models/TenantProfile');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { ROLES, TENANT_STATUS, UNIT_STATUS, IDENTITY_VERIFICATION_STATUS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const { generateTempPassword } = require('../utils/tempPassword');
const inviteService = require('./invite.service');
const mobileValidationService = require('./mobileValidation.service');
const { loadScopedBuilding } = require('../middleware/buildingScope.middleware');
const { trustedIn } = require('../utils/mongoSafe');
const env = require('../config/env');

function devBypassAllowed() {

  return env.NODE_ENV !== 'production' && env.IDENTITY_VERIFICATION_DEV_BYPASS === true;
}

async function verifyIdentityOrThrow({ phone, idType, idNumber }) {
  let matched;
  try {
    matched = await mobileValidationService.validateMobileNumber({ phone, idType, idNumber });
  } catch {
    if (devBypassAllowed()) {
      logger.warn(
        { phoneLast4: phone.slice(-4) },
        'DEV BYPASS: identity verification skipped after external API failure. ' +
          'This tenant is recorded as bypassed_dev, NOT verified. Never enable in production.'
      );
      return IDENTITY_VERIFICATION_STATUS.BYPASSED_DEV;
    }
    throw new AppError(
      'Identity verification is temporarily unavailable. Please try again shortly.',
      503,
      'IDENTITY_VERIFICATION_UNAVAILABLE'
    );
  }

  if (!matched) {
    throw AppError.badRequest(
      'The phone number does not match the provided ID details. Please check and try again.'
    );
  }

  return IDENTITY_VERIFICATION_STATUS.VERIFIED;
}


async function writeTenantRecords(session, { unitId, fullName, phone, email, idType, idNumber, emergencyContactName, emergencyContactPhone, moveInDate, identityVerificationStatus }) {
  let user = await User.findOne({ phone }).session(session);

  if (user && user.role !== ROLES.TENANT) {
    throw AppError.conflict('This phone number is already registered under a different role');
  }

  if (!user) {
    const passwordHash = await User.hashPassword(generateTempPassword());
    const created = await User.create(
      [{ role: ROLES.TENANT, name: fullName, phone, email: email || undefined, passwordHash, isActive: true }],
      { session }
    );
    user = created[0];
  } else {

    const liveProfile = await TenantProfile.findOne({
      userId: user._id,
      status: trustedIn([TENANT_STATUS.PENDING, TENANT_STATUS.ACTIVE]),
    }).session(session);
    if (liveProfile) {
      throw AppError.conflict('This phone number already has an active tenancy');
    }
  }

  const tenantProfile = await TenantProfile.create(
    [
      {
        userId: user._id,
        unitId,
        idType,
        idNumber,
        emergencyContactName,
        emergencyContactPhone,
        moveInDate,
        status: TENANT_STATUS.ACTIVE,
        identityVerificationStatus,
        identityVerifiedAt:
          identityVerificationStatus === IDENTITY_VERIFICATION_STATUS.VERIFIED ? new Date() : null,
      },
    ],
    { session }
  );

  await Unit.updateOne({ _id: unitId }, { $set: { status: UNIT_STATUS.OCCUPIED } }, { session });

  return { user, tenantProfile: tenantProfile[0] };
}

// Entry point 1: invite-based self-registration (TenantRegister.jsx)
async function onboardViaInvite({ token, fullName, phone, email, idType, idNumber }) {
  const invite = await inviteService.validateInvite(token);
  if (invite.type !== 'tenant_invite') throw AppError.badRequest('Invalid invite type');

  const unit = await Unit.findById(invite.unitId);
  if (!unit || unit.isArchived) throw AppError.notFound('Unit no longer exists');
  if (unit.status !== UNIT_STATUS.VACANT) {
    throw AppError.conflict('This unit is no longer available');
  }

  const identityVerificationStatus = await verifyIdentityOrThrow({ phone, idType, idNumber });

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await writeTenantRecords(session, {
        unitId: unit._id,
        fullName,
        phone,
        email,
        idType,
        idNumber,
        moveInDate: new Date(),
        identityVerificationStatus,
      });

      invite.status = 'accepted';
      invite.acceptedAt = new Date();
      invite.createdUserId = result.user._id;
      await invite.save({ session });
    });

    logger.info(
      { userId: result.user._id.toString(), unitId: unit._id.toString() },
      'Tenant onboarded via invite'
    );
    return { phone: result.user.phone };
  } finally {
    await session.endSession();
  }
}

// Entry point 2: Caretaker/Owner direct-add no invite involved

async function createTenantDirect(req, data) {
  const unit = await Unit.findById(data.unitId);
  if (!unit || unit.isArchived) throw AppError.notFound('Unit not found');
  await loadScopedBuilding(req, unit.buildingId); 
  if (unit.status !== UNIT_STATUS.VACANT) {
    throw AppError.conflict('This unit is already occupied');
  }

  const identityVerificationStatus = await verifyIdentityOrThrow({
    phone: data.phone,
    idType: data.idType,
    idNumber: data.idNumber,
  });

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await writeTenantRecords(session, {
        unitId: unit._id,
        fullName: data.name,
        phone: data.phone,
        email: data.email,
        idType: data.idType,
        idNumber: data.idNumber,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        moveInDate: data.moveInDate,
        identityVerificationStatus,
      });
    });

    logger.info(
      {
        userId: result.user._id.toString(),
        unitId: unit._id.toString(),
        addedBy: req.user.id,
        identityVerificationStatus,
      },
      'Tenant added directly by Caretaker/Owner'
    );
    return { tenant: result.user.toJSON(), tenantProfile: result.tenantProfile };
  } finally {
    await session.endSession();
  }
}

// Validate-only — powers the "You're joining X, unit Y" screen before submission.

async function getInviteInfo(token) {
  const invite = await inviteService.validateInvite(token);
  if (invite.type !== 'tenant_invite') throw AppError.notFound('Invite not found');

  const unit = await Unit.findById(invite.unitId).populate('buildingId', 'name');
  if (!unit) throw AppError.notFound('Unit no longer exists');

  return {
    buildingName: unit.buildingId.name,
    unitLabel: unit.unitNumber,
    expiresAt: invite.expiresAt,
  };
}

//GET /buildings/:buildingId/tenants 

async function listTenants(req, buildingId, { page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  await loadScopedBuilding(req, buildingId);

  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
  const skip = (page - 1) * safeLimit;

  const units = await Unit.find({ buildingId, isArchived: false }).select('_id').lean();
  const unitIds = units.map((u) => u._id);

  const filter = { unitId: trustedIn(unitIds), status: trustedIn([TENANT_STATUS.PENDING, TENANT_STATUS.ACTIVE]) };

  const [profiles, total] = await Promise.all([
    TenantProfile.find(filter)
      .populate('userId', 'name phone email isActive')
      .populate('unitId', 'unitNumber type rentAmount')
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 }),
    TenantProfile.countDocuments(filter),
  ]);

  return {
    tenants: profiles,
    pagination: { page, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

// GET /tenants/:id

async function getTenant(req, tenantProfileId) {
  const profile = await TenantProfile.findById(tenantProfileId)
    .populate('userId', 'name phone email isActive')
    .populate('unitId', 'unitNumber type rentAmount buildingId');

  if (!profile) throw AppError.notFound('Tenant not found');
  await loadScopedBuilding(req, profile.unitId.buildingId);

  return profile;
}

// POST /tenants/:id/move-out 

async function moveOutTenant(req, tenantProfileId) {
  const profile = await TenantProfile.findById(tenantProfileId).populate('unitId', 'buildingId');
  if (!profile) throw AppError.notFound('Tenant not found');
  if (profile.status === TENANT_STATUS.MOVED_OUT) {
    throw AppError.badRequest('This tenant has already moved out');
  }

  await loadScopedBuilding(req, profile.unitId.buildingId);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      profile.status = TENANT_STATUS.MOVED_OUT;
      profile.moveOutDate = new Date();
      await profile.save({ session });

      await Unit.updateOne(
        { _id: profile.unitId._id },
        { $set: { status: UNIT_STATUS.VACANT } },
        { session }
      );
    });

    logger.info(
      { tenantProfileId, unitId: profile.unitId._id.toString(), movedOutBy: req.user.id },
      'Tenant moved out, unit marked vacant'
    );
  } finally {
    await session.endSession();
  }
}

/// POST /units/:id/invite-link 
async function createInviteLink(req, unitId) {
  const unit = await Unit.findById(unitId);
  if (!unit || unit.isArchived) throw AppError.notFound('Unit not found');
  await loadScopedBuilding(req, unit.buildingId);

  if (unit.status !== UNIT_STATUS.VACANT) {
    throw AppError.conflict('Cannot invite a tenant to an already-occupied unit');
  }

  const invite = await inviteService.createTenantInvite({ invitedBy: req.user.id, unitId: unit._id });


  
  const link = `${env.APP_BASE_URL.replace(/\/$/, '')}/register/${invite.token}`;

  logger.info(
    { unitId: unit._id.toString(), invitedBy: req.user.id },
    'Tenant invite link created'
  );

  return { token: invite.token, link, expiresAt: invite.expiresAt };
}

module.exports = {
  onboardViaInvite,
  createTenantDirect,
  createInviteLink,
  getInviteInfo,
  listTenants,
  getTenant,
  moveOutTenant,
};