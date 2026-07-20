'use strict';
const mongoose = require('mongoose');
const User = require('../models/User');
const Building = require('../models/Building');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { ROLES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const inviteService = require('./invite.service');
const notificationService = require('./notification.service');
const { revokeAllUserTokens } = require('./token.service');
const { generateTempPassword } = require('../utils/tempPassword');
const { NOTIFICATION_STATUS, ROLE_LABELS } = require('../config/constants');
const env = require('../config/env');

// NOTE: this link points at a public frontend route (owner invite acceptance
// screen) that does not exist in the client yet. It must be built — and
// wired to POST /owner-invites/:token/accept — before invite sends are
// useful end to end.
function buildOwnerInviteLink(token) {
  return `${env.APP_BASE_URL.replace(/\/$/, '')}/accept-invite/owner/${token}`;
}

function buildLoginUrl() {
  return `${env.APP_BASE_URL.replace(/\/$/, '')}/login`;
}

async function createOwnerDirect({ name, phone, email, invitedBy }) {
  const existing = await User.findOne({ phone }).lean();
  if (existing) throw AppError.conflict('A user with this phone number already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await User.hashPassword(tempPassword);

  const owner = await User.create({
    role: ROLES.OWNER,
    name,
    phone,
    email: email || undefined,
    passwordHash,
    isActive: true,
  });

  logger.info(
    { ownerId: owner._id.toString(), createdBy: invitedBy },
    'Owner account created directly by Admin'
  );

  // The temp password is transmitted out-of-band over WhatsApp ONLY — it is
  // never returned in this response, logged, or otherwise persisted in
  // plaintext (passwordHash above is the only stored copy).
  const delivery = await notificationService.sendWelcomeCredentialsWithRetry(phone, {
    name,
    roleLabel: ROLE_LABELS.owner,
    tempPassword,
    loginUrl: buildLoginUrl(),
  });

  if (delivery.status === NOTIFICATION_STATUS.FAILED) {
    logger.error(
      { ownerId: owner._id.toString(), lastError: delivery.lastError },
      'WhatsApp welcome-credentials delivery failed for newly created owner — account exists, admin must trigger resend'
    );
  } else {
    logger.info({ ownerId: owner._id.toString() }, 'Welcome credentials dispatched to owner via WhatsApp');
  }

  return {
    owner: owner.toJSON(),
    credentialsDelivery: { status: delivery.status, attempts: delivery.attempts },
  };
}

/**
 * Re-sends fresh temp-password credentials for an existing (already
 * created) owner — the recovery path when the original WhatsApp send
 * failed, or the owner lost the message. Rotates the password and revokes
 * existing sessions so a stale/failed-delivery password can't linger as a
 * valid credential.
 */
async function resendOwnerCredentials({ ownerId, actorId }) {
  const owner = await User.findOne({ _id: ownerId, role: ROLES.OWNER });
  if (!owner) throw AppError.notFound('Owner not found');
  if (!owner.isActive) throw AppError.conflict('Cannot resend credentials to a deactivated owner');

  const tempPassword = generateTempPassword();
  owner.passwordHash = await User.hashPassword(tempPassword);
  await owner.save();
  await revokeAllUserTokens(owner._id);

  const delivery = await notificationService.sendWelcomeCredentialsWithRetry(owner.phone, {
    name: owner.name,
    roleLabel: ROLE_LABELS.owner,
    tempPassword,
    loginUrl: buildLoginUrl(),
  });

  logger.info(
    { ownerId: owner._id.toString(), actorId, status: delivery.status },
    'Owner credentials resent via WhatsApp'
  );

  return { status: delivery.status, attempts: delivery.attempts };
}

/** Admin sends an invite link instead of creating the account directly. */

async function inviteOwner({ phone, name, email, invitedBy }) {
  const existing = await User.findOne({ phone }).lean();
  if (existing) throw AppError.conflict('A user with this phone number already exists');

  const invite = await inviteService.createOwnerInvite({ invitedBy, phone, name, email });
  logger.info({ inviteId: invite._id.toString() }, 'Owner invite created');

  const delivery = await notificationService.sendInviteWithRetry(phone, {
    name,
    roleLabel: ROLE_LABELS.owner,
    inviteLink: buildOwnerInviteLink(invite.token),
  });

  if (delivery.status === NOTIFICATION_STATUS.FAILED) {
    logger.error(
      { inviteId: invite._id.toString(), lastError: delivery.lastError },
      'WhatsApp invite delivery failed — invite record exists, admin must trigger resend'
    );
  } else {
    logger.info({ inviteId: invite._id.toString() }, 'Owner invite link dispatched via WhatsApp');
  }

  return { invite, inviteDelivery: { status: delivery.status, attempts: delivery.attempts } };
}

/** Re-sends the invite link for a still-pending owner invite. */
async function resendOwnerInvite({ inviteId, actorId }) {
  const invite = await inviteService.findPendingInviteById(inviteId); // throws if expired/revoked/accepted — cannot resend a dead invite
  if (invite.type !== 'owner_invite') throw AppError.notFound('Invite not found');

  const delivery = await notificationService.sendInviteWithRetry(invite.phone, {
    name: invite.name,
    roleLabel: ROLE_LABELS.owner,
    inviteLink: buildOwnerInviteLink(invite.token),
  });

  logger.info(
    { inviteId: invite._id.toString(), actorId, status: delivery.status },
    'Owner invite resent via WhatsApp'
  );

  return { status: delivery.status, attempts: delivery.attempts };
}

/**
 * Invited person accepts: sets their own password, activating the account.*/

async function acceptOwnerInvite({ token, password }) {
  const session = await mongoose.startSession();
  try {
    let owner;
    await session.withTransaction(async () => {
      const invite = await inviteService.validateInvite(token);
      if (invite.type !== 'owner_invite') {
        throw AppError.badRequest('Invalid invite type');
      }

      const existing = await User.findOne({ phone: invite.phone }).session(session).lean();
      if (existing) throw AppError.conflict('A user with this phone number already exists');

      const passwordHash = await User.hashPassword(password);
      const created = await User.create(
        [
          {
            role: ROLES.OWNER,
            name: invite.name || 'Owner',
            phone: invite.phone,
            email: invite.email || undefined,
            passwordHash,
            isActive: true,
          },
        ],
        { session }
      );
      owner = created[0];

      invite.status = 'accepted';
      invite.acceptedAt = new Date();
      invite.createdUserId = owner._id;
      await invite.save({ session });
    });

    logger.info({ ownerId: owner._id.toString() }, 'Owner invite accepted, account activated');
    return owner.toJSON();
  } finally {
    await session.endSession();
  }
}

async function listOwners({ page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
  const skip = (page - 1) * safeLimit;

  const [owners, total] = await Promise.all([
    User.find({ role: ROLES.OWNER }).skip(skip).limit(safeLimit).sort({ createdAt: -1 }),
    User.countDocuments({ role: ROLES.OWNER }),
  ]);

  return {
    owners: owners.map((o) => o.toJSON()),
    pagination: { page, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

/** Single owner, with the buildings they own — matches the admin UI's OwnerDetails contract. */
async function getOwner(ownerId) {
  const owner = await User.findOne({ _id: ownerId, role: ROLES.OWNER });
  if (!owner) throw AppError.notFound('Owner not found');

  const buildings = await Building.find({ ownerId: owner._id, isArchived: false })
    .select('_id name')
    .sort({ createdAt: -1 })
    .lean();

  return {
    ...owner.toJSON(),
    buildings: buildings.map((b) => ({ id: b._id.toString(), name: b.name })),
  };
}

async function updateOwner(ownerId, updates) {
  const owner = await User.findOne({ _id: ownerId, role: ROLES.OWNER });
  if (!owner) throw AppError.notFound('Owner not found');

  const wasActive = owner.isActive;
  Object.assign(owner, updates);
  await owner.save();

  if (wasActive && owner.isActive === false) {
    await revokeAllUserTokens(owner._id);
  }

  logger.info({ ownerId: owner._id.toString() }, 'Owner updated');
  return owner.toJSON();
}

/** Soft deactivate — does not delete the owner's buildings. For a full destructive
 *  delete (owner + buildings + cascades), see admin.service.js's deleteUser. */
async function deactivateOwner(ownerId) {
  const owner = await User.findOne({ _id: ownerId, role: ROLES.OWNER });
  if (!owner) throw AppError.notFound('Owner not found');

  owner.isActive = false;
  await owner.save();
  await revokeAllUserTokens(owner._id);

  logger.info({ ownerId: owner._id.toString() }, 'Owner deactivated');
  return owner.toJSON();
}

async function setOwnerActive(ownerId, isActive) {
  const owner = await User.findOne({ _id: ownerId, role: ROLES.OWNER });
  if (!owner) throw AppError.notFound('Owner not found');

  owner.isActive = isActive;
  await owner.save();


  if (!isActive) {
    await revokeAllUserTokens(owner._id);
  }

  logger.info({ ownerId: owner._id.toString(), isActive }, 'Owner active status changed');
  return owner.toJSON();
}

module.exports = {
  createOwnerDirect,
  resendOwnerCredentials,
  inviteOwner,
  resendOwnerInvite,
  acceptOwnerInvite,
  listOwners,
  getOwner,
  updateOwner,
  deactivateOwner,
  setOwnerActive,
};