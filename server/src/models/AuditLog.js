'use strict';

const { Schema, model } = require('mongoose');
const { ACTIVITY_ACTION, ACTIVITY_LOG_RETENTION_DAYS } = require('../config/constants');

const ACTIVITY_ACTION_VALUES = Object.values(ACTIVITY_ACTION);

const AuditLogSchema = new Schema(
  {

    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, trim: true, maxlength: 120, default: 'System' },
    actorRole: { type: String, default: null },

    action: { type: String, enum: ACTIVITY_ACTION_VALUES, required: true, index: true },


    target: { type: String, trim: true, maxlength: 160, default: null },
    targetId: { type: Schema.Types.ObjectId, default: null },

    description: { type: String, trim: true, maxlength: 300, required: true },


    metadata: { type: Schema.Types.Mixed, default: undefined },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

AuditLogSchema.index({ createdAt: -1 });


AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: ACTIVITY_LOG_RETENTION_DAYS * 24 * 60 * 60 }
);

module.exports = model('AuditLog', AuditLogSchema);
