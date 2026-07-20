'use strict';
const { z } = require('zod');
const { mongoIdSchema } = require('./common.validators');

const buildingIdParamSchema = z.object({ buildingId: mongoIdSchema }).strict();

const reportQuerySchema = z
  .object({
    period: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format')
      .optional(),
  })
  .strict();

const revenueTrendQuerySchema = z
  .object({
    months: z.coerce.number().int().min(1).max(12).default(6),
  })
  .strict();

module.exports = { buildingIdParamSchema, reportQuerySchema, revenueTrendQuerySchema };