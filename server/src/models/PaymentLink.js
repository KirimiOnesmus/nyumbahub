'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentLinkSchema = new Schema(
  {
    billId: {
      type: Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
      unique: true, 
    },

    // SHA-256 hex digest of the raw token.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
  },
  {
    timestamps: true, // createdAt drives the non-rent 30-day TTL check (live, not stored)
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.tokenHash;
        return ret;
      },
    },
  }
);


paymentLinkSchema.statics.hashToken = function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

module.exports = mongoose.model('PaymentLink', paymentLinkSchema);