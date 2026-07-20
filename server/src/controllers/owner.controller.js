'use strict';

const ownerService = require('../services/owner.service');
const inviteService = require('../services/invite.service');
const { signAccessToken, issueRefreshToken } = require('../services/token.service');
const { REFRESH_COOKIE_NAME, refreshCookieOptions } = require('../utils/cookies');
const AppError = require('../utils/AppError');
const User = require('../models/User');

const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; 

async function createOwnerDirect(req, res, next) {
  try {
    const { owner, credentialsDelivery } = await ownerService.createOwnerDirect({
      ...req.body,
      invitedBy: req.user.id,
    });

    // The temp password is never included here — it was sent directly to the
    // owner over WhatsApp. If credentialsDelivery.status is 'failed', use
    // POST /owners/:id/resend-credentials to retry.
    res.status(201).json({ success: true, data: { owner, credentialsDelivery } });
  } catch (err) {
    next(err);
  }
}

async function resendOwnerCredentials(req, res, next) {
  try {
    const credentialsDelivery = await ownerService.resendOwnerCredentials({
      ownerId: req.params.id,
      actorId: req.user.id,
    });
    res.status(200).json({ success: true, data: { credentialsDelivery } });
  } catch (err) {
    next(err);
  }
}

async function inviteOwner(req, res, next) {
  try {
    const { invite, inviteDelivery } = await ownerService.inviteOwner({
      ...req.body,
      invitedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: { inviteId: invite._id, expiresAt: invite.expiresAt, inviteDelivery },
    });
  } catch (err) {
    next(err);
  }
}

async function resendOwnerInvite(req, res, next) {
  try {
    const inviteDelivery = await ownerService.resendOwnerInvite({
      inviteId: req.params.id,
      actorId: req.user.id,
    });
    res.status(200).json({ success: true, data: { inviteDelivery } });
  } catch (err) {
    next(err);
  }
}

async function getOwnerInviteInfo(req, res, next) {
  try {
    const invite = await inviteService.validateInvite(req.params.token);
    if (invite.type !== 'owner_invite') throw AppError.notFound('Invite not found');

    res.status(200).json({
      success: true,
      data: {
        phone: invite.phone,
        name: invite.name,
        email: invite.email,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function acceptOwnerInvite(req, res, next) {
  try {
    const owner = await ownerService.acceptOwnerInvite(req.body);


    const user = await User.findById(owner._id || owner.id);
    const accessToken = signAccessToken(user);
    const { raw: refreshToken } = await issueRefreshToken(user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.status(201).json({ success: true, data: { accessToken, user: owner } });
  } catch (err) {
    next(err);
  }
}

async function listOwners(req, res, next) {
  try {
    const result = await ownerService.listOwners(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getOwner(req, res, next) {
  try {
    const owner = await ownerService.getOwner(req.params.id);
    res.status(200).json({ success: true, data: { owner } });
  } catch (err) {
    next(err);
  }
}

async function updateOwner(req, res, next) {
  try {
    const owner = await ownerService.updateOwner(req.params.id, req.body);
    res.status(200).json({ success: true, data: { owner } });
  } catch (err) {
    next(err);
  }
}

async function deactivateOwner(req, res, next) {
  try {
    const owner = await ownerService.deactivateOwner(req.params.id);
    res.status(200).json({ success: true, data: { owner } });
  } catch (err) {
    next(err);
  }
}

async function setOwnerActive(req, res, next) {
  try {
    const owner = await ownerService.setOwnerActive(req.params.id, req.body.isActive);
    res.status(200).json({ success: true, data: { owner } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOwnerDirect,
  resendOwnerCredentials,
  inviteOwner,
  resendOwnerInvite,
  getOwnerInviteInfo,
  acceptOwnerInvite,
  listOwners,
  getOwner,
  updateOwner,
  deactivateOwner,
  setOwnerActive,
};