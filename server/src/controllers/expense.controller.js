'use strict';

const expenseService = require('../services/expense.service');

async function createExpense(req, res, next) {
  try {
    const expense = await expenseService.createExpense(req, req.body);
    res.status(201).json({ success: true, data: { expense } });
  } catch (err) {
    next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    const result = await expenseService.listExpensesForBuilding(req, req.params.buildingId, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getExpense(req, res, next) {
  try {
    const expense = await expenseService.getExpenseById(req, req.params.id);
    res.status(200).json({ success: true, data: { expense } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createExpense, listExpenses, getExpense };
