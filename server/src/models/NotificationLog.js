"use strict";
const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  NOTIFICATION_STATUS,
  NOTIFICATION_MESSAGE_TYPE,
} = require("../config/constants");

const NOTIFICATION_STATUS_VALUES = Object.values(NOTIFICATION_STATUS);
const NOTIFICATION_MESSAGE_TYPE_VALUES = Object.values(
  NOTIFICATION_MESSAGE_TYPE,
);

const LAST_ERROR_MAX_LENGTH = 500;

const notificationLogSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "TenantProfile",
      required: true,
      index: true,
    },

    billId: {
      type: Schema.Types.ObjectId,
      ref: "Bill",
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: ["whatsapp"],
      default: "whatsapp",
    },

    messageType: {
      type: String,
      enum: NOTIFICATION_MESSAGE_TYPE_VALUES,
      required: true,
    },


    status: {
      type: String,
      enum: NOTIFICATION_STATUS_VALUES,
      required: true,
    },
    // Total attempts made in this send cycle (bounded retry, same job run).
    attempts: {
      type: Number,
      required: true,
      min: 1,
    },

    // Sanitized, human-readable failure reason ONLY.
    lastError: {
      type: String,
      default: null,
      maxlength: LAST_ERROR_MAX_LENGTH,
    },

    sentAt: {
      type: Date,
      default: null,
    },


    waMessageId: {
      type: String,
      default: null,
      sparse: true,
      unique: true,
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
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
  },
);


notificationLogSchema.index(
  { tenantId: 1, billId: 1, messageType: 1 },
  { unique: true },
);

module.exports = mongoose.model("NotificationLog", notificationLogSchema);