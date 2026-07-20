'use strict';
const { z } = require('zod');
const { paginationQuerySchema, mongoIdSchema } = require('./common.validators');
const { ANNOUNCEMENT_MESSAGE_MAX_LENGTH } = require('../../config/constants');
const createAnnouncementSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(ANNOUNCEMENT_MESSAGE_MAX_LENGTH, `Message must be under ${ANNOUNCEMENT_MESSAGE_MAX_LENGTH} characters`),
  })
  .strict();
const listAnnouncementsQuerySchema = paginationQuerySchema;
const buildingTenantParamsSchema = z
  .object({
    buildingId: mongoIdSchema,
    tenantId: mongoIdSchema,
  })
  .strict();
module.exports = {
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  buildingTenantParamsSchema,
};