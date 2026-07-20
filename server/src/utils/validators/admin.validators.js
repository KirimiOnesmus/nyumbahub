'use strict';

const { z } = require('zod');
const { phoneSchema } = require('./auth.validators');
const { mongoIdSchema, paginationQuerySchema } = require('./common.validators');

const userIdParamSchema = z.object({ id: mongoIdSchema }).strict();

const changeUserPhoneSchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();

const updateSystemConfigSchema = z
  .object({
    supportPhone: z.string().trim().max(20).optional(),
    supportEmail: z.string().trim().toLowerCase().email('Invalid email format').optional(),
    smsSenderId: z.string().trim().max(20).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const activityLogQuerySchema = paginationQuerySchema;

module.exports = {
  userIdParamSchema,
  changeUserPhoneSchema,
  updateSystemConfigSchema,
  activityLogQuerySchema,
};
