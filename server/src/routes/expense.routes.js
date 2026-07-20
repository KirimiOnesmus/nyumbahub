'use strict';

const { Router } = require('express');
const expenseController = require('../controllers/expense.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope, requireBuildingAccess } = require('../middleware/buildingScope.middleware');
const { expenseCreateLimiter } = require('../middleware/rateLimit.middleware');
const { ROLES } = require('../config/constants');
const {
  createExpenseSchema,
  buildingIdParamSchema,
  expenseIdParamSchema,
  listExpensesQuerySchema,
} = require('../utils/validators/expense.validators');

const router = Router();

router.use(
  ['/expenses', '/buildings/:buildingId/expenses'],
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  attachBuildingScope
);

router.post(
  '/expenses',
  expenseCreateLimiter,
  validate({ body: createExpenseSchema }),
  expenseController.createExpense
);

router.get(
  '/buildings/:buildingId/expenses',
  requireBuildingAccess('buildingId'),
  validate({ params: buildingIdParamSchema, query: listExpensesQuerySchema }),
  expenseController.listExpenses
);

router.get('/expenses/:id', validate({ params: expenseIdParamSchema }), expenseController.getExpense);

module.exports = router;