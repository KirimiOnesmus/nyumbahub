'use strict';

const { Schema, model } = require('mongoose');

const RefreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    replacesTokenId: { type: Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: ['ROTATED', 'LOGOUT', 'LOGOUT_ALL', 'REUSE_DETECTED', null],
      default: null,
    },
    createdByIp: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);


RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = model('RefreshToken', RefreshTokenSchema);