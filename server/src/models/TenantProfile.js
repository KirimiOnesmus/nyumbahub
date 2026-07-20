'use strict';

const { Schema, model } = require('mongoose');
const { TENANT_STATUS, ID_TYPE, IDENTITY_VERIFICATION_STATUS } = require('../config/constants');

const TenantProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },

    idType: { type: String, enum: Object.values(ID_TYPE), required: true },
    idNumber: { type: String, trim: true, required: true, select: false }, 
    emergencyContactName: { type: String, trim: true, maxlength: 120 },
    emergencyContactPhone: { type: String, trim: true, maxlength: 20 },

    moveInDate: { type: Date },
    moveOutDate: { type: Date },

    status: {
      type: String,
      enum: Object.values(TENANT_STATUS),
      default: TENANT_STATUS.PENDING,
    },

    // Mobile Number Validation API result (phone vs idType/idNumber match).
    identityVerificationStatus: {
      type: String,
      enum: Object.values(IDENTITY_VERIFICATION_STATUS),
      default: IDENTITY_VERIFICATION_STATUS.PENDING,
    },
    identityVerifiedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.idNumber; // select: false at query time, but strip defensively if ever populated
        return ret;
      },
    },
  }
);

TenantProfileSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'active'] } } }
);

module.exports = model('TenantProfile', TenantProfileSchema);