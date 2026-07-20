'use strict';
const mongoose = require('mongoose');
const User = require('../models/User');
const Building = require('../models/Building');
const CaretakerAssignment = require('../models/CaretakerAssignment');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { ROLES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const { generateTempPassword } = require('../utils/tempPassword');
const { revokeAllUserTokens } = require('./token.service');
const { assertBuildingInScope, scopedIdFilter } = require('../middleware/buildingScope.middleware');
const { trustedIn } = require('../utils/mongoSafe');
const notificationService = require('./notification.service');
const { NOTIFICATION_STATUS, ROLE_LABELS } = require('../config/constants');
const env = require('../config/env');

function buildLoginUrl() {
  return `${env.APP_BASE_URL.replace(/\/$/, '')}/login`;
}

/**Validates every buildingId in the request is (a) a real, non-archived building and (b) within the caller's own scope. */

async function assertBuildingsOwnedAndInScope(req, buildingIds) {
  const uniqueIds = [...new Set(buildingIds.map(String))];

  const buildings = await Building.find({ _id: trustedIn(uniqueIds), isArchived: false }).select(
    '_id'
  );
  if (buildings.length !== uniqueIds.length) {
    throw AppError.badRequest('One or more buildings are invalid or no longer exist');
  }

  for (const id of uniqueIds) {
    assertBuildingInScope(req, id); // throws 404 if out of scope — no existence-leak
  }

  return uniqueIds;
}

async function createCaretaker(req, { name, phone, email, buildingIds }) {
  const validBuildingIds = await assertBuildingsOwnedAndInScope(req, buildingIds);

  const existing = await User.findOne({ phone }).lean();
  if (existing) throw AppError.conflict('A user with this phone number already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await User.hashPassword(tempPassword);

  const session = await mongoose.startSession();
  try {
    let caretaker;
    await session.withTransaction(async () => {
      const created = await User.create(
        [{ role: ROLES.CARETAKER, name, phone, email: email || undefined, passwordHash, isActive: true }],
        { session }
      );
      caretaker = created[0];

      await CaretakerAssignment.insertMany(
        validBuildingIds.map((buildingId) => ({ caretakerId: caretaker._id, buildingId })),
        { session }
      );
    });

    logger.info(
      { caretakerId: caretaker._id.toString(), buildingCount: validBuildingIds.length, createdBy: req.user.id },
      'Caretaker created and assigned'
    );

    // Sent out-of-band via WhatsApp only — never returned in the HTTP response.
    const delivery = await notificationService.sendWelcomeCredentialsWithRetry(phone, {
      name,
      roleLabel: ROLE_LABELS.caretaker,
      tempPassword,
      loginUrl: buildLoginUrl(),
    });

    if (delivery.status === NOTIFICATION_STATUS.FAILED) {
      logger.error(
        { caretakerId: caretaker._id.toString(), lastError: delivery.lastError },
        'WhatsApp welcome-credentials delivery failed for newly created caretaker — account exists, use resend-credentials'
      );
    }

    return {
      caretaker: caretaker.toJSON(),
      assignedBuildingIds: validBuildingIds,
      credentialsDelivery: { status: delivery.status, attempts: delivery.attempts },
    };
  } finally {
    await session.endSession();
  }
}

/** Recovery path for a failed/lost initial delivery. Rotates the password and
 * revokes existing sessions so the old (possibly-undelivered) one can't be used. */
async function resendCaretakerCredentials(req, caretakerId) {
  const caretaker = await User.findOne({ _id: caretakerId, role: ROLES.CARETAKER });
  if (!caretaker) throw AppError.notFound('Caretaker not found');
  if (!caretaker.isActive) throw AppError.conflict('Cannot resend credentials to a deactivated caretaker');

  const assignments = await getScopedAssignments(req, caretakerId);
  if (!req.buildingScope.unrestricted && assignments.length === 0) {
    throw AppError.notFound('Caretaker not found');
  }

  const tempPassword = generateTempPassword();
  caretaker.passwordHash = await User.hashPassword(tempPassword);
  await caretaker.save();
  await revokeAllUserTokens(caretaker._id);

  const delivery = await notificationService.sendWelcomeCredentialsWithRetry(caretaker.phone, {
    name: caretaker.name,
    roleLabel: ROLE_LABELS.caretaker,
    tempPassword,
    loginUrl: buildLoginUrl(),
  });

  logger.info(
    { caretakerId: caretaker._id.toString(), actorId: req.user.id, status: delivery.status },
    'Caretaker credentials resent via WhatsApp'
  );

  return { status: delivery.status, attempts: delivery.attempts };
}

/** Building IDs a caretaker is assigned to, filtered to the caller's own scope. */

async function getScopedAssignments(req, caretakerId) {
  const filter = { caretakerId };
  const idFilter = scopedIdFilter(req.buildingScope);
  if (idFilter) filter.buildingId = idFilter;
  return CaretakerAssignment.find(filter).select('buildingId').lean();
}

async function listCaretakers(req, { page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
  const skip = (page - 1) * safeLimit;

  let caretakerIdFilter;
  const scopeIdFilter = scopedIdFilter(req.buildingScope);
  if (scopeIdFilter) {
    const assignments = await CaretakerAssignment.find({
      buildingId: scopeIdFilter,
    })
      .select('caretakerId')
      .lean();
    caretakerIdFilter = [...new Set(assignments.map((a) => a.caretakerId.toString()))];
    if (caretakerIdFilter.length === 0) {
      return { caretakers: [], pagination: { page, limit: safeLimit, total: 0, pages: 0 } };
    }
  }

  const filter = { role: ROLES.CARETAKER };
  if (caretakerIdFilter) filter._id = trustedIn(caretakerIdFilter);

  const [caretakers, total] = await Promise.all([
    User.find(filter).skip(skip).limit(safeLimit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  const withAssignments = await Promise.all(
    caretakers.map(async (c) => ({
      ...c.toJSON(),
      buildingIds: (await getScopedAssignments(req, c._id)).map((a) => a.buildingId),
    }))
  );

  return {
    caretakers: withAssignments,
    pagination: { page, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

async function getCaretaker(req, caretakerId) {
  const caretaker = await User.findOne({ _id: caretakerId, role: ROLES.CARETAKER });
  if (!caretaker) throw AppError.notFound('Caretaker not found');

  const assignments = await getScopedAssignments(req, caretakerId);
  if (!req.buildingScope.unrestricted && assignments.length === 0) {

    // Caretaker exists, but has no assignment within this caller's scope —treat as not found rather than leaking that the account exists.
   
    throw AppError.notFound('Caretaker not found');
  }

  return { ...caretaker.toJSON(), buildingIds: assignments.map((a) => a.buildingId) };
}

async function updateCaretaker(req, caretakerId, updates) {
  await getCaretaker(req, caretakerId); // throws if not accessible in scope

  const caretaker = await User.findOne({ _id: caretakerId, role: ROLES.CARETAKER });
  const wasActive = caretaker.isActive;

  Object.assign(caretaker, updates);
  await caretaker.save();

  if (wasActive && caretaker.isActive === false) {
    await revokeAllUserTokens(caretaker._id);
  }

  logger.info({ caretakerId: caretaker._id.toString(), updatedBy: req.user.id }, 'Caretaker updated');
  return caretaker.toJSON();
}

async function assignCaretakerToBuilding(req, caretakerId, buildingId) {
  const caretaker = await User.findOne({ _id: caretakerId, role: ROLES.CARETAKER });
  if (!caretaker) throw AppError.notFound('Caretaker not found');

  await assertBuildingsOwnedAndInScope(req, [buildingId]);

  try {
    await CaretakerAssignment.create({ caretakerId, buildingId });
  } catch (err) {
    if (err.code === 11000) {
      throw AppError.conflict('Caretaker is already assigned to this building');
    }
    throw err;
  }

  logger.info({ caretakerId, buildingId, assignedBy: req.user.id }, 'Caretaker assigned to building');
}

/** Soft deactivate — preserves CaretakerAssignment history for audit purposes. */

async function deactivateCaretaker(req, caretakerId) {
  await getCaretaker(req, caretakerId); 
  const caretaker = await User.findOne({ _id: caretakerId, role: ROLES.CARETAKER });

  caretaker.isActive = false;
  await caretaker.save();
  await revokeAllUserTokens(caretaker._id);

  logger.info({ caretakerId, deactivatedBy: req.user.id }, 'Caretaker deactivated');
}

module.exports = {
  createCaretaker,
  resendCaretakerCredentials,
  listCaretakers,
  getCaretaker,
  updateCaretaker,
  assignCaretakerToBuilding,
  deactivateCaretaker,
};