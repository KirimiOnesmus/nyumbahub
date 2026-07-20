'use strict';

const { Schema, model } = require('mongoose');

const InviteSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },

    createdUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, discriminatorKey: 'type' }
);

const Invite = model('Invite', InviteSchema);

const OwnerInvite = Invite.discriminator(
  'owner_invite',
  new Schema({
    phone: {
      type: String,
      required: true,
      match: [/^\+254[17]\d{8}$/, 'Phone must be E.164 Kenyan MSISDN'],
    },
    name: { type: String, trim: true, maxlength: 120 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
  })
);

const TenantInvite = Invite.discriminator(
  'tenant_invite',
  new Schema({
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
  })
);

OwnerInvite.schema.index(
  { phone: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending', type: 'owner_invite' } }
);
TenantInvite.schema.index(
  { unitId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending', type: 'tenant_invite' } }
);

module.exports = { Invite, OwnerInvite, TenantInvite };