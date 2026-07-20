'use strict';

const { Schema, model } = require('mongoose');
const { UNIT_TYPE, UNIT_STATUS } = require('../config/constants');

const UnitSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
    unitNumber: { type: String, required: true, trim: true, maxlength: 30 },
    type: { type: String, enum: Object.values(UNIT_TYPE), required: true },

    rentAmount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(UNIT_STATUS), default: UNIT_STATUS.VACANT },
    isArchived: { type: Boolean, default: false },
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

// A unit number must be unique within its building, but the same number (e.g. "A1") can reasonably repeat across different buildings.

UnitSchema.index({ buildingId: 1, unitNumber: 1 }, { unique: true });
UnitSchema.index({ buildingId: 1, status: 1 });

module.exports = model('Unit', UnitSchema);