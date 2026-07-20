'use strict';

const Expense = require('../models/Expense');
const AppError = require('../utils/AppError');
const {
  loadScopedBuilding,
  assertBuildingInScope,
} = require('../middleware/buildingScope.middleware');
const { ROLES, DEFAULT_PAGE_SIZE } = require('../config/constants');

const GENERIC_NOT_FOUND = 'Expense not found.';

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function serializeExpense(expense) {
  return {
    id: expense._id.toString(),
    building: expense.buildingId?.name
      ? { id: expense.buildingId._id.toString(), name: expense.buildingId.name }
      : { id: expense.buildingId.toString(), name: null },
    category: expense.category,
    amount: expense.amount,
    description: expense.description,
    dateIncurred: expense.dateIncurred,
    loggedBy: expense.loggedBy?.name
      ? { id: expense.loggedBy._id.toString(), name: expense.loggedBy.name }
      : { id: expense.loggedBy.toString(), name: null },
    loggedByRole: expense.loggedByRole,
    createdAt: expense.createdAt,
  };
}

// POST /expenses — any of caretaker/owner/admin, scoped to a building they
// have access to. loggedBy/loggedByRole are always derived from the
// authenticated actor, never accepted from the request body.
async function createExpense(req, input) {
  const building = await loadScopedBuilding(req, input.buildingId);

  const expense = await Expense.create({
    buildingId: building._id,
    category: input.category,
    amount: input.amount,
    description: input.description,
    dateIncurred: input.dateIncurred,
    loggedBy: req.user.id,
    loggedByRole: req.user.role,
  });

  await expense.populate([
    { path: 'buildingId', select: 'name' },
    { path: 'loggedBy', select: 'name' },
  ]);

  return serializeExpense(expense);
}

// GET /buildings/:buildingId/expenses
// Business rule: caretakers only ever see the expenses *they* logged for
// this building; owners/admins see every caretaker's entries for buildings
// they own. The route also runs requireBuildingAccess — this re-check is
// intentional defense in depth, not redundancy we can safely drop.
async function listExpensesForBuilding(req, buildingId, query) {
  assertBuildingInScope(req, buildingId);

  const filter = { buildingId };
  if (req.user.role === ROLES.CARETAKER) {
    filter.loggedBy = req.user.id;
  }
  if (query.category) {
    filter.category = query.category;
  }

  const page = query.page || 1;
  const limit = query.limit || DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Expense.find(filter)
      .sort({ dateIncurred: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'buildingId', select: 'name' })
      .populate({ path: 'loggedBy', select: 'name' })
      .lean(),
    Expense.countDocuments(filter),
  ]);

  const items = rows.map((expense) => ({
    id: expense._id.toString(),
    building: { id: expense.buildingId._id.toString(), name: expense.buildingId.name },
    category: expense.category,
    amount: expense.amount,
    description: expense.description,
    dateIncurred: expense.dateIncurred,
    loggedBy: { id: expense.loggedBy._id.toString(), name: expense.loggedBy.name },
    loggedByRole: expense.loggedByRole,
    createdAt: expense.createdAt,
  }));

  const totalAmount = roundMoney(items.reduce((sum, e) => sum + e.amount, 0));

  return {
    items,
    totalAmount,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

// GET /expenses/:id — object-level authorization: building scope first,
// then (for caretakers only) an explicit ownership check so a caretaker
// cannot enumerate another caretaker's expense by guessing/incrementing ids.
async function getExpenseById(req, expenseId) {
  const expense = await Expense.findById(expenseId)
    .populate({ path: 'buildingId', select: 'name' })
    .populate({ path: 'loggedBy', select: 'name' });

  if (!expense) {
    throw AppError.notFound(GENERIC_NOT_FOUND);
  }

  assertBuildingInScope(req, expense.buildingId._id);

  if (req.user.role === ROLES.CARETAKER && expense.loggedBy._id.toString() !== req.user.id) {
    // Same response as "doesn't exist" — never reveal that a resource
    // exists but belongs to someone else.
    throw AppError.notFound(GENERIC_NOT_FOUND);
  }

  return serializeExpense(expense);
}

module.exports = {
  createExpense,
  listExpensesForBuilding,
  getExpenseById,
  // exported for direct unit testing
  serializeExpense,
};
