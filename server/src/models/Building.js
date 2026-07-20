'use strict';

const { Schema, model } = require('mongoose');

const BuildingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model('Building', BuildingSchema);