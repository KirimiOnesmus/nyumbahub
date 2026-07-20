"use strict";

const { z } = require("zod");
const { normalizeKenyanPhone } = require("../phone");

const phoneSchema = z
  .string()
  .trim()
  .transform((val, ctx) => {
    const normalized = normalizeKenyanPhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter a valid Kenyan phone number, e.g. 0712345678 or +254712345678",
      });
      return z.NEVER;
    }
    return normalized;
  });

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a digit");

const loginSchema = z
  .object({
    phone: phoneSchema,

    password: z.string().min(1).max(128),
  })
  .strict();

const logoutSchema = z
  .object({
    allDevices: z.boolean().optional().default(false),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .strict();

const requestPasswordResetSchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();

const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(256),
    newPassword: passwordSchema,
  })
  .strict();

// Self-service profile edit. Deliberately excludes phone — it's the login credential (unique, used for auth + WhatsApp) and role is immutable at the schema level; both require a more deliberate flow than a plain PATCH.

const nameSchema = z.string().trim().min(1, "Name is required").max(120);
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email format")
  .optional();

const updateMeSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

module.exports = {
  phoneSchema,
  passwordSchema,
  loginSchema,
  logoutSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  updateMeSchema,
};
