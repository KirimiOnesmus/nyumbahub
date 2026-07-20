'use strict';

const { z } = require('zod');
const { phoneSchema } = require('./auth.validators');
const { mongoIdSchema } = require('./common.validators');
const { ID_TYPE } = require('../../config/constants');

const idTypeSchema = z.enum(Object.values(ID_TYPE), {
  errorMap: () => ({ message: 'Select a valid ID type' }),
});
const idNumberSchema = z.string().trim().min(1, 'ID number is required').max(30);

// Invite-based self-registration (TenantRegister.jsx). unitId is NOT here — it comes from the invite itself, never trusted from client input.

const onboardTenantSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(120),
    phone: phoneSchema,
    email: z.string().trim().toLowerCase().email('Invalid email format').optional(),
    idType: idTypeSchema,
    idNumber: idNumberSchema,
  })
  .strict();


const createTenantDirectSchema = z
  .object({
    name: z.string().trim().min(1, 'Full name is required').max(120),
    phone: phoneSchema,
    email: z.string().trim().toLowerCase().email('Invalid email format').optional(),
    idType: idTypeSchema,
    idNumber: idNumberSchema,
    emergencyContactName: z.string().trim().max(120).optional(),
    emergencyContactPhone: z.string().trim().max(20).optional(),
    unitId: mongoIdSchema,
    moveInDate: z.coerce.date(),
  })
  .strict();

module.exports = { onboardTenantSchema, createTenantDirectSchema };