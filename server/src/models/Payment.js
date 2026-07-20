'use strict';

const { Schema, model } = require('mongoose');
const { PAYMENT_STATUS } = require('../config/constants');

const PaymentSchema = new Schema(
  {
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true, index: true },
  
    tenantId: { type: Schema.Types.ObjectId, ref: 'TenantProfile', required: true, index: true },


    amount: { type: Number, required: true, min: 1 },

    phone: { type: String, required: true },


    checkoutRequestId: { type: String, unique: true, sparse: true },
    merchantRequestId: { type: String },

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },

    mpesaReceiptNumber: { type: String, sparse: true },
    resultCode: { type: Number, default: null },
    resultDesc: { type: String, default: null },
    transactionDate: { type: Date, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ billId: 1, status: 1 });
PaymentSchema.index({ status: 1, transactionDate: -1 });

module.exports = model('Payment', PaymentSchema);