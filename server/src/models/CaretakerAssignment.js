'use strict';

const { Schema, model } = require('mongoose');

const CaretakerAssignmentSchema = new Schema(
  {
    caretakerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  },
  { timestamps: true }
);

CaretakerAssignmentSchema.index({ caretakerId: 1, buildingId: 1 }, { unique: true });

module.exports = model('CaretakerAssignment', CaretakerAssignmentSchema);