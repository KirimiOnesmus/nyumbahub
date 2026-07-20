'use strict';

const { z } = require('zod');
const { phoneSchema, passwordSchema } = require('./auth.validators');
const { mongoIdSchema, paginationQuerySchema, inviteTokenParamSchema } = require('./common.validators');

const nameSchema = z.string().trim().min(1, 'Name is required').max(120);
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .optional();

const createOwnerDirectSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
  })
  .strict();

const inviteOwnerSchema = z
  .object({
    phone: phoneSchema,
    name: nameSchema.optional(),
    email: emailSchema,
  })
  .strict();

const acceptOwnerInviteBodySchema = z
  .object({
    password: passwordSchema,
  })
  .strict();

const listOwnersQuerySchema = paginationQuerySchema;

const setOwnerActiveSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

const updateOwnerSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema,
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const ownerIdParamSchema = z.object({ id: mongoIdSchema }).strict();

module.exports = {
  createOwnerDirectSchema,
  inviteOwnerSchema,
  inviteTokenParamSchema,
  acceptOwnerInviteBodySchema,
  listOwnersQuerySchema,
  setOwnerActiveSchema,
  updateOwnerSchema,
  ownerIdParamSchema,
};