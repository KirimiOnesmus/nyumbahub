'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const {
  ROLES,
  EXPENSE_CATEGORY,
  EXPENSE_AMOUNT_MIN,
  EXPENSE_AMOUNT_MAX,
  EXPENSE_DESCRIPTION_MAX_LENGTH,
} = require('../config/constants');

const EXPENSE_CATEGORY_VALUES = Object.values(EXPENSE_CATEGORY);
// Admins can log on a building's behalf during support/ops work, but expenses
// are otherwise a caretaker/owner concept — kept narrow and explicit rather
// than reusing the full ROLES set.
const LOGGED_BY_ROLE_VALUES = [ROLES.CARETAKER, ROLES.OWNER, ROLES.ADMIN];

const ExpenseSchema = new Schema(
  {
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: EXPENSE_CATEGORY_VALUES,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: EXPENSE_AMOUNT_MIN,
      max: EXPENSE_AMOUNT_MAX,
      set: (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v),
    },

    description: {
      type: String,
      trim: true,
      maxlength: EXPENSE_DESCRIPTION_MAX_LENGTH,
      default: '',
    },

    dateIncurred: {
      type: Date,
      required: true,
    },

    // Server-set only — never accept from client input (mass assignment guard).
    loggedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Snapshot of the actor's role at logging time, for audit clarity even
    // if the user's role changes later (e.g. caretaker promoted to owner).
    loggedByRole: {
      type: String,
      enum: LOGGED_BY_ROLE_VALUES,
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

// Building-scoped listing, newest first (the dominant query pattern).
ExpenseSchema.index({ buildingId: 1, dateIncurred: -1 });
// Caretaker "my expenses within this building" filter.
ExpenseSchema.index({ buildingId: 1, loggedBy: 1 });
// Cross-building "my expenses" lookups / audit trails by actor.
ExpenseSchema.index({ loggedBy: 1, createdAt: -1 });

module.exports = mongoose.models.Expense || model('Expense', ExpenseSchema);
