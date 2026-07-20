'use strict';


const env = require('../config/env');
const logger = require('../utils/logger');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const phone = process.env.ADMIN_PHONE;
  const password = process.env.ADMIN_PASSWORD;

  if (!phone || !password) {
    logger.error(
      'ADMIN_PHONE and ADMIN_PASSWORD must be set in .env before running this script'
    );
    process.exitCode = 1;
    return;
  }

  await connectDB();

  const existingAdmin = await User.findOne({ role: ROLES.ADMIN }).lean();
  if (existingAdmin) {
    logger.warn(
      { existingAdminId: existingAdmin._id.toString() },
      'An Admin account already exists — this system is single-admin by design. Aborting, no changes made.'
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await User.hashPassword(password);

  const admin = await User.create({
    role: ROLES.ADMIN,
    name: 'Admin',
    email: email || undefined,
    phone,
    passwordHash,
    isActive: true,
    isEmailVerified: false,
  });

  logger.info(
    { adminId: admin._id.toString(), phone: admin.phone },
    'Admin account created successfully. Remove ADMIN_PASSWORD from .env now.'
  );
}

seedAdmin()
  .catch((err) => {
    logger.error({ err: err.message }, 'Admin seed script failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
    process.exit(process.exitCode || 0);
  });