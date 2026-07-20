'use strict';

const { z } = require('zod');
const { phoneSchema } = require('./auth.validators');
const { inviteTokenParamSchema, mongoIdSchema } = require('./common.validators');

const paymentTokenParamSchema = inviteTokenParamSchema;

const initiatePaymentBodySchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();

const paymentStatusParamSchema = z
  .object({
    token: z.string().min(32).max(256),
    paymentId: mongoIdSchema,
  })
  .strict();

const buildingIdParamSchema = z
  .object({
    buildingId: mongoIdSchema,
  })
  .strict();

const listBuildingPaymentsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(20).default(5),
  })
  .strict();

module.exports = {
  paymentTokenParamSchema,
  initiatePaymentBodySchema,
  paymentStatusParamSchema,
  buildingIdParamSchema,
  listBuildingPaymentsQuerySchema,
};