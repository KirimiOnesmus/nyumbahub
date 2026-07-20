'use strict';

const { Router } = require('express');
const ownerController = require('../controllers/owner.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { ownerInviteLimiter, credentialsResendLimiter } = require('../middleware/rateLimit.middleware');
const { mongoIdSchema } = require('../utils/validators/common.validators');
const { z } = require('zod');

const inviteIdParamSchema = z.object({ id: mongoIdSchema }).strict();
const { ROLES } = require('../config/constants');
const {
  createOwnerDirectSchema,
  inviteOwnerSchema,
  inviteTokenParamSchema,
  acceptOwnerInviteBodySchema,
  listOwnersQuerySchema,
  setOwnerActiveSchema,
  updateOwnerSchema,
  ownerIdParamSchema,
} = require('../utils/validators/owner.validators');

const router = Router();

//  Admin-only management 
router.post(
  '/owners',
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ body: createOwnerDirectSchema }),
  ownerController.createOwnerDirect
);

router.post(
  '/owners/invite',
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ body: inviteOwnerSchema }),
  ownerController.inviteOwner
);

router.post(
  '/owners/:id/resend-credentials',
  requireAuth,
  requireRole(ROLES.ADMIN),
  credentialsResendLimiter,
  validate({ params: ownerIdParamSchema }),
  ownerController.resendOwnerCredentials
);

router.post(
  '/owner-invites/:id/resend',
  requireAuth,
  requireRole(ROLES.ADMIN),
  credentialsResendLimiter,
  validate({ params: inviteIdParamSchema }),
  ownerController.resendOwnerInvite
);

router.get(
  '/owners',
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ query: listOwnersQuerySchema }),
  ownerController.listOwners
);

router.patch(
  '/owners/:id/active',
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ params: ownerIdParamSchema, body: setOwnerActiveSchema }),
  ownerController.setOwnerActive
);

router.get(
  '/owners/:id',
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ params: ownerIdParamSchema }),
  ownerController.getOwner
);

router.patch(
  '/owners/:id',
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ params: ownerIdParamSchema, body: updateOwnerSchema }),
  ownerController.updateOwner
);

// Soft deactivate only — does not touch the owner's buildings. For a full
// destructive delete with cascade, see DELETE /admin/users/:id.
router.delete(
  '/owners/:id',
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ params: ownerIdParamSchema }),
  ownerController.deactivateOwner
);

//  Public — invited person
router.get(
  '/owner-invites/:token',
  ownerInviteLimiter,
  validate({ params: inviteTokenParamSchema }),
  ownerController.getOwnerInviteInfo
);

router.post(
  '/owner-invites/:token/accept',
  ownerInviteLimiter,
  validate({ params: inviteTokenParamSchema, body: acceptOwnerInviteBodySchema }),
  ownerController.acceptOwnerInvite
);

module.exports = router;