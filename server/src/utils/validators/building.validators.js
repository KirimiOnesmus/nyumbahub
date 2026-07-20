'use strict';

const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');
const { UNIT_TYPE } = require('../../config/constants');

const unitTypeItemSchema = z
  .object({
    type: z.enum(Object.values(UNIT_TYPE), {
      errorMap: () => ({ message: 'Invalid unit type' }),
    }),
  
    label: z.string().trim().max(50).optional(),
    quantity: z.coerce
      .number()
      .int()
      .positive()
      .max(200, 'Maximum 200 units per type in a single batch'),
    rentAmount: z.coerce
      .number()
      .positive()
      .max(10_000_000, 'Rent amount looks unrealistic — check the value'),
  })
  .strict();

const createBuildingSchema = z
  .object({
    name: z.string().trim().min(1, 'Building name is required').max(150),
    address: z.string().trim().min(1, 'Address is required').max(300),
    unitTypes: z
      .array(unitTypeItemSchema)
      .min(1, 'Select at least one unit type')
      .max(Object.keys(UNIT_TYPE).length, 'Too many unit type entries'),
  })
  .strict();

const updateBuildingSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    address: z.string().trim().min(1).max(300).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const listBuildingsQuerySchema = paginationQuerySchema;

module.exports = {
  unitTypeItemSchema,
  createBuildingSchema,
  updateBuildingSchema,
  listBuildingsQuerySchema,
};