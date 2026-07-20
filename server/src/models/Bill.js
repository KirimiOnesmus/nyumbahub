'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const {
  BILL_TYPE,
  BILL_STATUS,
  BILL_AMOUNT_MIN,
  BILL_AMOUNT_MAX,
  BILL_NOTES_MAX_LENGTH,
} = require('../config/constants');

const BILL_TYPE_VALUES = Object.values(BILL_TYPE);
const BILL_STATUS_VALUES = Object.values(BILL_STATUS);
const GENERATED_BY_VALUES = ['system', 'caretaker', 'owner', 'admin'];

const BillSchema = new Schema(
  {
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
      index: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'TenantProfile',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: BILL_TYPE_VALUES,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: BILL_AMOUNT_MIN,
      max: BILL_AMOUNT_MAX,
      set: (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v),
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
      set: (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v),
      validate: {
        validator: function (value) {
          return value <= this.amount;
        },
        message: 'amountPaid cannot exceed the bill amount.',
      },
    },

    period: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: BILL_STATUS_VALUES,
      default: BILL_STATUS.UNPAID,
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: BILL_NOTES_MAX_LENGTH,
      default: '',
    },

    generatedBy: {
      type: String,
      enum: GENERATED_BY_VALUES,
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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

// Prevent duplicate RENT bills for the same unit and period
BillSchema.index(
  { unitId: 1, period: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: BILL_TYPE.RENT,
    },
  }
);

// Frequently used query indexes
BillSchema.index({ unitId: 1, status: 1 });
BillSchema.index({ dueDate: 1 });
BillSchema.index({ tenantId: 1, period: 1 });
BillSchema.index({ createdBy: 1 });

module.exports = mongoose.models.Bill || model('Bill', BillSchema);