'use strict';

const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');
const { UNIT_TYPE, UNIT_STATUS } = require('../../config/constants');

const createUnitSchema = z
  .object({
    unitNumber: z.string().trim().min(1, 'Unit number is required').max(30),
    type: z.enum(Object.values(UNIT_TYPE), { errorMap: () => ({ message: 'Select a unit type' }) }),
    monthlyRent: z.coerce.number().positive().max(10_000_000, 'Rent amount looks unrealistic'),
  })
  .strict();

const updateUnitSchema = z
  .object({
    unitNumber: z.string().trim().min(1).max(30).optional(),
    type: z.enum(Object.values(UNIT_TYPE)).optional(),
    monthlyRent: z.coerce.number().positive().max(10_000_000).optional(),
    status: z.enum(Object.values(UNIT_STATUS)).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const listUnitsQuerySchema = paginationQuerySchema;

module.exports = { createUnitSchema, updateUnitSchema, listUnitsQuerySchema };