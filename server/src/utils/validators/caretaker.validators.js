'use strict';
const { z } = require('zod');
const { phoneSchema } = require('./auth.validators');
const { mongoIdSchema, paginationQuerySchema } = require('./common.validators');

const nameSchema = z.string().trim().min(1, 'Name is required').max(120);
const emailSchema = z.string().trim().toLowerCase().email('Invalid email format').optional();

const createCaretakerSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    buildingIds: z
      .array(mongoIdSchema)
      .min(1, 'Assign the caretaker to at least one building')
      .max(50, 'Too many buildings in one request'),
  })
  .strict();

const updateCaretakerSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema,
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const assignBuildingSchema = z
  .object({
    buildingId: mongoIdSchema,
  })
  .strict();

const listCaretakersQuerySchema = paginationQuerySchema;

module.exports = {
  createCaretakerSchema,
  updateCaretakerSchema,
  assignBuildingSchema,
  listCaretakersQuerySchema,
};