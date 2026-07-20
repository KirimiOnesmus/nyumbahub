'use strict';
const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { ROLES } = require('../config/constants');

const UserSchema = new Schema(
  {
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      immutable: true, // role changes must go through an explicit, owner-only action — never a generic PATCH
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
      sparse: true,
    },
    // E.164, WhatsApp-registered. e.g. +2547XXXXXXXX
    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^\+254[17]\d{8}$/, 'Phone must be in Kenyan MSISDN'],
    },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },

    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },

    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpiresAt: { type: Date, default: null, select: false },

    mfaEnabled: { type: Boolean, default: false },
    mfaSecretEncrypted: { type: String, default: null, select: false },
  },
  { timestamps: true } 
);

UserSchema.index({ role: 1 });

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockedUntil && this.lockedUntil > new Date());
};

UserSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
};

// Last line of defense: strip sensitive fields from every JSON response,

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash;
    delete ret.failedLoginAttempts;
    delete ret.lockedUntil;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    delete ret.emailVerificationTokenHash;
    delete ret.emailVerificationExpiresAt;
    delete ret.mfaSecretEncrypted;
    delete ret.__v;
    return ret;
  },
});

module.exports = model('User', UserSchema);