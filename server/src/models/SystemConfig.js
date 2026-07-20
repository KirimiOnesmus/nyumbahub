'use strict';

const { Schema, model } = require('mongoose');

// Deliberately a singleton: the whole app has exactly one of these
// documents. Callers go through admin.service.js#getOrCreateSystemConfig
// rather than querying this model directly, so there's one place that
// enforces "there is only ever one".
const SystemConfigSchema = new Schema(
  {
    supportPhone: { type: String, trim: true, default: '' },
    supportEmail: { type: String, trim: true, lowercase: true, default: '' },
    smsSenderId: { type: String, trim: true, maxlength: 20, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
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

module.exports = model('SystemConfig', SystemConfigSchema);
