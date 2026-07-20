
'use strict';
const { z } = require('zod');
const { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } = require('../../config/constants');


const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier format');

const idParamSchema = z.object({ id: mongoIdSchema }).strict();

const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict();

const inviteTokenParamSchema = z
  .object({
    token: z.string().min(32).max(256),
  })
  .strict();

module.exports = { mongoIdSchema, idParamSchema, paginationQuerySchema, inviteTokenParamSchema };