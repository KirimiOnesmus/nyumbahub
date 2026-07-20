'use strict';

const { z } = require('zod');

const { mongoIdSchema, paginationQuerySchema } = require('./common.validators');
const {
  EXPENSE_CATEGORY,
  EXPENSE_AMOUNT_MIN,
  EXPENSE_AMOUNT_MAX,
  EXPENSE_DESCRIPTION_MAX_LENGTH,
  EXPENSE_DATE_MAX_PAST_DAYS,
} = require('../../config/constants');

const EXPENSE_CATEGORY_VALUES = Object.values(EXPENSE_CATEGORY);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const dateIncurredSchema = z.coerce
  .date({ errorMap: () => ({ message: 'A valid date incurred is required.' }) })
  .refine(
    (date) => {
      const max = startOfToday();
      max.setHours(23, 59, 59, 999);
      return date <= max;
    },
    { message: 'Date incurred cannot be in the future.' }
  )
  .refine(
    (date) => {
      const min = startOfToday();
      min.setDate(min.getDate() - EXPENSE_DATE_MAX_PAST_DAYS);
      return date >= min;
    },
    { message: `Date incurred cannot be more than ${EXPENSE_DATE_MAX_PAST_DAYS} days in the past.` }
  );

const createExpenseSchema = z
  .object({
    buildingId: mongoIdSchema,
    category: z.enum(EXPENSE_CATEGORY_VALUES, {
      errorMap: () => ({
        message: `category must be one of: ${EXPENSE_CATEGORY_VALUES.join(', ')}.`,
      }),
    }),
    amount: z
      .number({ errorMap: () => ({ message: 'A valid amount is required.' }) })
      .min(EXPENSE_AMOUNT_MIN)
      .max(EXPENSE_AMOUNT_MAX),
    dateIncurred: dateIncurredSchema,
    description: z.string().trim().max(EXPENSE_DESCRIPTION_MAX_LENGTH).optional().default(''),
  })
  .strict();

const buildingIdParamSchema = z
  .object({
    buildingId: mongoIdSchema,
  })
  .strict();

const expenseIdParamSchema = z
  .object({
    id: mongoIdSchema,
  })
  .strict();

const listExpensesQuerySchema = paginationQuerySchema
  .extend({
    category: z.enum(EXPENSE_CATEGORY_VALUES).optional(),
  })
  .strict();

module.exports = {
  createExpenseSchema,
  buildingIdParamSchema,
  expenseIdParamSchema,
  listExpensesQuerySchema,
};
