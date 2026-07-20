'use strict';

const { z } = require('zod');

const { mongoIdSchema, paginationQuerySchema } = require('./common.validators');
const {
  BILL_TYPE,
  BILL_STATUS,
  BILL_AMOUNT_MIN,
  BILL_AMOUNT_MAX,
  BILL_NOTES_MAX_LENGTH,
  BILL_DUE_DATE_MIN_DAYS_AHEAD,
  BILL_DUE_DATE_MAX_DAYS_AHEAD,
  BULK_BILL_MAX,
} = require('../../config/constants');

const MANUAL_BILL_TYPES = Object.values(BILL_TYPE).filter((t) => t !== BILL_TYPE.RENT);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const dueDateSchema = z.coerce
  .date({ errorMap: () => ({ message: 'A valid due date is required.' }) })
  .refine(
    (date) => {
      const min = startOfToday();
      min.setDate(min.getDate() + BILL_DUE_DATE_MIN_DAYS_AHEAD);
      return date >= min;
    },
    { message: 'Due date cannot be in the past.' }
  )
  .refine(
    (date) => {
      const max = startOfToday();
      max.setDate(max.getDate() + BILL_DUE_DATE_MAX_DAYS_AHEAD);
      return date <= max;
    },
    { message: `Due date cannot be more than ${BILL_DUE_DATE_MAX_DAYS_AHEAD} days from now.` }
  );


const billItemSchema = z
  .object({
    tenantId: mongoIdSchema,
    type: z.enum(MANUAL_BILL_TYPES, {
      errorMap: () => ({
        message: `type must be one of: ${MANUAL_BILL_TYPES.join(', ')} (rent bills are system-generated only).`,
      }),
    }),
    amount: z
      .number({ errorMap: () => ({ message: 'A valid amount is required.' }) })
      .min(BILL_AMOUNT_MIN)
      .max(BILL_AMOUNT_MAX),
    dueDate: dueDateSchema,
    notes: z.string().trim().max(BILL_NOTES_MAX_LENGTH).optional().default(''),
  })
  .strict();

const createBillSchema = billItemSchema;

const createBillsBulkSchema = z
  .array(billItemSchema)
  .min(1, 'At least one bill is required.')
  .max(BULK_BILL_MAX, `Cannot submit more than ${BULK_BILL_MAX} bills in a single batch.`);

const buildingIdParamSchema = z
  .object({
    buildingId: mongoIdSchema,
  })
  .strict();

const billIdParamSchema = z
  .object({
    id: mongoIdSchema,
  })
  .strict();


const listBillsQuerySchema = paginationQuerySchema
  .extend({
    status: z.enum([...Object.values(BILL_STATUS), 'overdue']).optional(),
    type: z.enum(Object.values(BILL_TYPE)).optional(),
  })
  .strict();


const markPaidSchema = z
  .object({
    amountPaid: z
      .number({ errorMap: () => ({ message: 'A valid payment amount is required.' }) })
      .positive('Payment amount must be greater than zero.')
      .max(BILL_AMOUNT_MAX),

    paidAt: z.coerce
      .date()
      .max(new Date(), { message: 'paidAt cannot be in the future.' })
      .optional(),
  })
  .strict();

module.exports = {
  MANUAL_BILL_TYPES,
  createBillSchema,
  createBillsBulkSchema,
  buildingIdParamSchema,
  billIdParamSchema,
  listBillsQuerySchema,
  markPaidSchema,
};