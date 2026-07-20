'use strict';

const billService = require('../services/bill.service');

async function createBill(req, res, next) {
  try {
    const bill = await billService.createBill(req, req.body);
    res.status(201).json({ success: true, data: { bill } });
  } catch (err) {
    next(err);
  }
}

async function createBillsBulk(req, res, next) {
  try {
    const bills = await billService.createBillsBulk(req, req.body);
    res.status(201).json({ success: true, data: { bills } });
  } catch (err) {
    next(err);
  }
}

async function listBills(req, res, next) {
  try {
    const result = await billService.listBillsForBuilding(req, req.params.buildingId, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getBill(req, res, next) {
  try {
    const bill = await billService.getBillById(req, req.params.id);
    res.status(200).json({ success: true, data: { bill } });
  } catch (err) {
    next(err);
  }
}

async function markBillPaid(req, res, next) {
  try {
    const bill = await billService.markBillPaid(req, req.params.id, req.body);
    res.status(200).json({ success: true, data: { bill } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBill, createBillsBulk, listBills, getBill, markBillPaid };