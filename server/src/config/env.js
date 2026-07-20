'use strict';

require('dotenv').config();
const { z } = require('zod');


const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_BASE_URL: z.string().url(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be >= 32 chars'),

  CORS_ALLOWED_ORIGINS: z.string().min(1),

  MPESA_CONSUMER_KEY: z.string().min(1),
  MPESA_CONSUMER_SECRET: z.string().min(1),
  MPESA_SHORTCODE: z.string().min(1),
  MPESA_PASSKEY: z.string().min(1),
  MPESA_CALLBACK_URL: z.string().url(),
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),

  // Dev/staging-only escape hatch: when the Mobile Number Validation API is
  // unreachable, skip identity verification instead of blocking tenant
  // creation. 
  IDENTITY_VERIFICATION_DEV_BYPASS: z.enum(['true', 'false']).default('false'),

  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  // Required — whatsappWebhook.controller.js uses this to HMAC-verify every
  // inbound status webhook (crypto.timingSafeEqual against x-hub-signature-256).
  // Leaving this unset lets an attacker forge delivery/read status callbacks.
  WHATSAPP_APP_SECRET: z.string().min(1),
});


const isTest = process.env.NODE_ENV === 'test';

const thirdPartyKeys = [
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORTCODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL',
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'WHATSAPP_APP_SECRET',
];

const schemaForEnv = isTest
  ? envSchema.partial(Object.fromEntries(thirdPartyKeys.map((k) => [k, true])))
  : envSchema;

const parsed = schemaForEnv.safeParse(process.env);

if (!parsed.success) {

  const missingOrInvalid = parsed.error.issues.map((i) => i.path.join('.'));

  console.error(
    `[FATAL] Invalid or missing environment configuration: ${missingOrInvalid.join(', ')}`
  );
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.IDENTITY_VERIFICATION_DEV_BYPASS === 'true') {
  console.error(
    '[FATAL] IDENTITY_VERIFICATION_DEV_BYPASS must not be set in production. Refusing to start.'
  );
  process.exit(1);
}

module.exports = Object.freeze({
  ...parsed.data,
  IDENTITY_VERIFICATION_DEV_BYPASS: parsed.data.IDENTITY_VERIFICATION_DEV_BYPASS === 'true',
});