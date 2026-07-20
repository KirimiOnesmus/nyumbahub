'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

const ACCESS_TOKEN_TYPE = 'access';

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: ACCESS_TOKEN_TYPE,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.type !== ACCESS_TOKEN_TYPE) {
    throw new Error('Invalid token type');
  }
  return payload;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}


async function issueRefreshToken(user, { family, replacesTokenId = null, ip, userAgent } = {}) {
  const raw = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + msFromDuration(env.JWT_REFRESH_EXPIRES_IN));

  const doc = await RefreshToken.create({
    userId: user._id,
    tokenHash,
    family: family || crypto.randomUUID(),
    replacesTokenId,
    expiresAt,
    createdByIp: ip,
    userAgent,
  });

  return { raw, doc };
}


async function rotateRefreshToken(rawToken, { ip, userAgent } = {}) {
  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  if (existing.revokedAt) {
 
    await RefreshToken.updateMany(
      { family: existing.family, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'REUSE_DETECTED' } }
    );
    throw new Error('REFRESH_TOKEN_REUSE_DETECTED');
  }

  if (existing.expiresAt < new Date()) {
    throw new Error('REFRESH_TOKEN_EXPIRED');
  }

  existing.revokedAt = new Date();
  existing.revokedReason = 'ROTATED';
  await existing.save();

  return existing;
}

async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT_ALL' } }
  );
}

async function revokeToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } }
  );
}

function msFromDuration(duration) {

  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // sane fallback: 30 days
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return value * unitMs;
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
  revokeToken,
  hashToken,
};