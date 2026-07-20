'use strict';

const { Schema, model } = require('mongoose');
const { ANNOUNCEMENT_MESSAGE_MAX_LENGTH } = require('../config/constants');

const AnnouncementSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'TenantProfile', default: null, index: true },
    message: { type: String, required: true, trim: true, maxlength: ANNOUNCEMENT_MESSAGE_MAX_LENGTH },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientCount: { type: Number, required: true, default: 0 },
    successCount: { type: Number, required: true, default: 0 },
    failureCount: { type: Number, required: true, default: 0 },
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

module.exports = model('Announcement', AnnouncementSchema);