'use strict';

const crypto = require('crypto');
const { Invite, OwnerInvite, TenantInvite } = require('../models/Invite');
const AppError = require('../utils/AppError');
const {
  OWNER_INVITE_TOKEN_BYTES,
  OWNER_INVITE_EXPIRY_HOURS,
  INVITE_TOKEN_BYTES,
  INVITE_EXPIRY_HOURS,
} = require('../config/constants');

function generateToken(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

async function createOwnerInvite({ invitedBy, phone, name, email }) {
  const token = generateToken(OWNER_INVITE_TOKEN_BYTES);
  const expiresAt = new Date(Date.now() + OWNER_INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
  try {
    return await OwnerInvite.create({ token, invitedBy, phone, name, email, expiresAt });
  } catch (err) {
    if (err.code === 11000) {
      throw AppError.conflict('An active invite already exists for this phone number');
    }
    throw err;
  }
}

async function createTenantInvite({ invitedBy, unitId }) {
  const token = generateToken(INVITE_TOKEN_BYTES);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
  try {
    return await TenantInvite.create({ token, invitedBy, unitId, expiresAt });
  } catch (err) {
    if (err.code === 11000) {
      throw AppError.conflict('An active invite already exists for this unit');
    }
    throw err;
  }
}

async function validateInvite(token) {
  const invite = await Invite.findOne({ token });
  if (!invite) throw AppError.notFound('Invite not found or already used');

  if (invite.status === 'revoked') throw AppError.forbidden('This invite has been revoked');
  if (invite.status === 'accepted') throw AppError.conflict('This invite has already been used');

  if (invite.status === 'expired' || invite.expiresAt < new Date()) {
    if (invite.status !== 'expired') {
      invite.status = 'expired';
      await invite.save();
    }
    throw AppError.badRequest('This invite link has expired');
  }

  return invite;
}


async function acceptInvite(token, createdUserId) {
  const invite = await validateInvite(token);
  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  invite.createdUserId = createdUserId;
  await invite.save();
  return invite;
}


async function findPendingInviteById(inviteId) {
  const invite = await Invite.findById(inviteId);
  if (!invite) throw AppError.notFound('Invite not found');

  if (invite.status === 'revoked') throw AppError.forbidden('This invite has been revoked');
  if (invite.status === 'accepted') throw AppError.conflict('This invite has already been used');

  if (invite.status === 'expired' || invite.expiresAt < new Date()) {
    if (invite.status !== 'expired') {
      invite.status = 'expired';
      await invite.save();
    }
    throw AppError.badRequest('This invite link has expired — create a new one instead of resending');
  }

  return invite;
}

async function revokeInvite(inviteId) {
  const invite = await Invite.findById(inviteId);
  if (!invite) throw AppError.notFound('Invite not found');
  if (invite.status !== 'pending') {
    throw AppError.badRequest('Only pending invites can be revoked');
  }
  invite.status = 'revoked';
  await invite.save();
  return invite;
}

module.exports = {
  createOwnerInvite,
  createTenantInvite,
  validateInvite,
  findPendingInviteById,
  acceptInvite,
  revokeInvite,
};