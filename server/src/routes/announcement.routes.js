'use strict';

const { Router } = require('express');
const announcementController = require('../controllers/announcement.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope } = require('../middleware/buildingScope.middleware');
const { announcementLimiter } = require('../middleware/rateLimit.middleware');
const { ROLES } = require('../config/constants');
const {
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  buildingTenantParamsSchema,
} = require('../utils/validators/announcement.validators');

const router = Router();

router.use(requireAuth, requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN), attachBuildingScope);

router.post(
  '/buildings/:buildingId/announcements',
  announcementLimiter,
  validate({ body: createAnnouncementSchema }),
  announcementController.createAnnouncement
);

router.post(
  '/buildings/:buildingId/tenants/:tenantId/announcements',
  announcementLimiter,
  validate({ params: buildingTenantParamsSchema, body: createAnnouncementSchema }),
  announcementController.sendDirectAnnouncement
);

router.get(
  '/buildings/:buildingId/announcements',
  validate({ query: listAnnouncementsQuerySchema }),
  announcementController.listAnnouncements
);

module.exports = router;