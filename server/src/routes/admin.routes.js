'use strict';

const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { ROLES } = require('../config/constants');
const {
  userIdParamSchema,
  changeUserPhoneSchema,
  updateSystemConfigSchema,
  activityLogQuerySchema,
} = require('../utils/validators/admin.validators');

const router = Router();

// Every route below is super-admin only.
router.use('/admin', requireAuth, requireRole(ROLES.ADMIN));

router.get('/admin/overview', adminController.getOverview);

router.get('/admin/system-config', adminController.getSystemConfig);

router.patch(
  '/admin/system-config',
  validate({ body: updateSystemConfigSchema }),
  adminController.updateSystemConfig
);

router.patch(
  '/admin/users/:id/phone',
  validate({ params: userIdParamSchema, body: changeUserPhoneSchema }),
  adminController.changeUserPhone
);

router.patch(
  '/admin/users/:id/reset-password',
  validate({ params: userIdParamSchema }),
  adminController.resetUserPassword
);

// Hard-deletes an owner or caretaker account. For owners, this cascades:
// their buildings and units are deleted, caretakers assigned to those
// buildings are deleted, and tenants in those units are archived (moved
// out + deactivated) rather than deleted, preserving billing history.
router.delete(
  '/admin/users/:id',
  validate({ params: userIdParamSchema }),
  adminController.deleteUser
);

router.get('/admin/system-health', adminController.getSystemHealth);

router.get(
  '/admin/activity-log',
  validate({ query: activityLogQuerySchema }),
  adminController.getActivityLog
);

module.exports = router;
