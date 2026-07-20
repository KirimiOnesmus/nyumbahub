'use strict';

const Building = require('../models/Building');
const Unit = require('../models/Unit');
const Bill = require('../models/Bill');
const Expense = require('../models/Expense');
const TenantProfile = require('../models/TenantProfile');
const { loadScopedBuilding, scopedIdFilter } = require('../middleware/buildingScope.middleware');
const { trustedIn, trustedOp } = require('../utils/mongoSafe');
const { BILL_STATUS, TENANT_STATUS, EXPENSE_CATEGORY } = require('../config/constants');
const { nairobiDateParts, nairobiMidnightUTC } = require('../utils/nairobiTime');

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

const OVERDUE_STATUSES = [BILL_STATUS.UNPAID, BILL_STATUS.PARTIAL];
const EXPENSE_CATEGORY_VALUES = Object.values(EXPENSE_CATEGORY);

function periodToDateRange(period) {
  if (!period) return null;
  const [year, month] = period.split('-').map(Number);
  return {
    start: nairobiMidnightUTC(year, month, 1),
    end: nairobiMidnightUTC(year, month + 1, 1),
  };
}


function trailingPeriods(count) {
  const { year, month } = nairobiDateParts(new Date());
  const periods = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    let y = year;
    let m = month - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return periods;
}

async function getPortfolioReport(req, { period } = {}) {
  const buildingFilter = { isArchived: false };
  const idFilter = scopedIdFilter(req.buildingScope);
  if (idFilter) buildingFilter._id = idFilter;
  const buildings = await Building.find(buildingFilter).select('name').lean();
  const buildingIds = buildings.map((b) => b._id);

  const units = await Unit.find({ buildingId: trustedIn(buildingIds), isArchived: false })
    .select('_id buildingId status')
    .lean();
  const unitToBuilding = new Map(units.map((u) => [u._id.toString(), u.buildingId.toString()]));
  const unitIds = units.map((u) => u._id);

  const billFilter = { unitId: trustedIn(unitIds) };
  if (period) billFilter.period = period;
  const bills = await Bill.find(billFilter).select('unitId amount amountPaid status dueDate').lean();

  const expenseFilter = { buildingId: trustedIn(buildingIds) };
  const range = periodToDateRange(period);
  if (range) expenseFilter.dateIncurred = trustedOp({ $gte: range.start, $lt: range.end });
  const expenses = await Expense.find(expenseFilter).select('buildingId category amount').lean();

  const zeroCategoryTotals = () => Object.fromEntries(EXPENSE_CATEGORY_VALUES.map((c) => [c, 0]));

  const perBuilding = new Map(
    buildings.map((b) => [
      b._id.toString(),
      {
        buildingId: b._id.toString(),
        buildingName: b.name,
        totalBilled: 0,
        totalCollected: 0,
        totalExpenses: 0,
        expensesByCategory: zeroCategoryTotals(),
        totalUnits: 0,
        occupiedUnits: 0,
        overdueCount: 0,
      },
    ])
  );

  for (const u of units) {
    const entry = perBuilding.get(u.buildingId.toString());
    if (!entry) continue;
    entry.totalUnits += 1;
    if (u.status === 'occupied') entry.occupiedUnits += 1;
  }

  const now = new Date();
  for (const bill of bills) {
    const buildingId = unitToBuilding.get(bill.unitId.toString());
    const entry = perBuilding.get(buildingId);
    if (!entry) continue;
    entry.totalBilled += bill.amount;
    entry.totalCollected += bill.amountPaid;
    if (OVERDUE_STATUSES.includes(bill.status) && new Date(bill.dueDate) < now) {
      entry.overdueCount += 1;
    }
  }

  const expensesByCategory = zeroCategoryTotals();
  for (const expense of expenses) {
    const entry = perBuilding.get(expense.buildingId.toString());
    const isKnownCategory = Object.prototype.hasOwnProperty.call(expensesByCategory, expense.category);
    if (entry) {
      entry.totalExpenses += expense.amount;
      if (isKnownCategory) entry.expensesByCategory[expense.category] += expense.amount;
    }
    if (isKnownCategory) expensesByCategory[expense.category] += expense.amount;
  }
  for (const category of EXPENSE_CATEGORY_VALUES) {
    expensesByCategory[category] = roundMoney(expensesByCategory[category]);
  }

  const buildingsBreakdown = Array.from(perBuilding.values()).map((e) => ({
    ...e,
    expensesByCategory: Object.fromEntries(
      Object.entries(e.expensesByCategory).map(([c, v]) => [c, roundMoney(v)])
    ),
    totalBilled: roundMoney(e.totalBilled),
    totalCollected: roundMoney(e.totalCollected),
    totalExpenses: roundMoney(e.totalExpenses),
    netIncome: roundMoney(e.totalCollected - e.totalExpenses),
    outstandingBalance: roundMoney(e.totalBilled - e.totalCollected),
    occupancyRate: e.totalUnits > 0 ? roundMoney((e.occupiedUnits / e.totalUnits) * 100) : 0,
  }));

  const totals = buildingsBreakdown.reduce(
    (acc, e) => ({
      totalBilled: acc.totalBilled + e.totalBilled,
      totalCollected: acc.totalCollected + e.totalCollected,
      totalExpenses: acc.totalExpenses + e.totalExpenses,
      totalUnits: acc.totalUnits + e.totalUnits,
      occupiedUnits: acc.occupiedUnits + e.occupiedUnits,
      overdueCount: acc.overdueCount + e.overdueCount,
    }),
    { totalBilled: 0, totalCollected: 0, totalExpenses: 0, totalUnits: 0, occupiedUnits: 0, overdueCount: 0 }
  );

  return {
    period: period || 'all-time',
    totals: {
      ...totals,
      totalBilled: roundMoney(totals.totalBilled),
      totalCollected: roundMoney(totals.totalCollected),
      totalExpenses: roundMoney(totals.totalExpenses),
      netIncome: roundMoney(totals.totalCollected - totals.totalExpenses),
      outstandingBalance: roundMoney(totals.totalBilled - totals.totalCollected),
      occupancyRate: totals.totalUnits > 0 ? roundMoney((totals.occupiedUnits / totals.totalUnits) * 100) : 0,
    },
    expensesByCategory,
    buildings: buildingsBreakdown,
  };
}

async function getBuildingReport(req, buildingId, { period } = {}) {
  const building = await loadScopedBuilding(req, buildingId);

  const units = await Unit.find({ buildingId, isArchived: false }).select('_id status').lean();
  const unitIds = units.map((u) => u._id);
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
  const vacantUnits = totalUnits - occupiedUnits;

 
  const bills = await Bill.find({ unitId: trustedIn(unitIds) })
    .select('amount amountPaid status dueDate period')
    .lean();
  const periodBills = period ? bills.filter((b) => b.period === period) : bills;

  let totalBilled = 0;
  let totalCollected = 0;
  for (const bill of periodBills) {
    totalBilled += bill.amount;
    totalCollected += bill.amountPaid;
  }

  const now = new Date();
  let unpaidBills = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  for (const bill of bills) {
    if (!OVERDUE_STATUSES.includes(bill.status)) continue;
    unpaidBills += 1;
    if (new Date(bill.dueDate) < now) {
      overdueCount += 1;
      overdueAmount += bill.amount - bill.amountPaid;
    }
  }

  const [activeTenants, pendingTenants] = await Promise.all([
    TenantProfile.countDocuments({ unitId: trustedIn(unitIds), status: TENANT_STATUS.ACTIVE }),
    TenantProfile.countDocuments({ unitId: trustedIn(unitIds), status: TENANT_STATUS.PENDING }),
  ]);

  return {
    buildingId: building._id.toString(),
    buildingName: building.name,
    period: period || 'all-time',
    totalBilled: roundMoney(totalBilled),
    totalCollected: roundMoney(totalCollected),
    outstandingBalance: roundMoney(totalBilled - totalCollected),
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyRate: totalUnits > 0 ? roundMoney((occupiedUnits / totalUnits) * 100) : 0,
    activeTenants,
    pendingTenants,
    unpaidBills,
    overdueCount,
    overdueAmount: roundMoney(overdueAmount),
  };
}

async function getOverdueTenants(req, buildingId) {
  const building = await loadScopedBuilding(req, buildingId);

  const units = await Unit.find({ buildingId, isArchived: false }).select('_id unitNumber').lean();
  const unitIds = units.map((u) => u._id);
  const unitNumberById = new Map(units.map((u) => [u._id.toString(), u.unitNumber]));

  const overdueBills = await Bill.find({
    unitId: trustedIn(unitIds),
    status: trustedIn(OVERDUE_STATUSES),
    dueDate: trustedOp({ $lt: new Date() }),
  })
    .select('unitId tenantId amount amountPaid dueDate')
    .lean();

  const byTenant = new Map();
  for (const bill of overdueBills) {
    const key = bill.tenantId.toString();
    if (!byTenant.has(key)) {
      byTenant.set(key, {
        tenantId: key,
        unitId: bill.unitId.toString(),
        totalOverdue: 0,
        oldestDueDate: bill.dueDate,
        billCount: 0,
      });
    }
    const entry = byTenant.get(key);
    entry.totalOverdue += bill.amount - bill.amountPaid;
    entry.billCount += 1;
    if (new Date(bill.dueDate) < new Date(entry.oldestDueDate)) entry.oldestDueDate = bill.dueDate;
  }

  const tenantIds = Array.from(byTenant.keys());
  const tenantProfiles = await TenantProfile.find({ _id: trustedIn(tenantIds) })
    .populate('userId', 'name phone')
    .lean();
  const tenantById = new Map(tenantProfiles.map((tp) => [tp._id.toString(), tp]));

  const overdueTenants = Array.from(byTenant.values())
    .map((entry) => {
      const tp = tenantById.get(entry.tenantId);
      return {
        tenantId: entry.tenantId,
        tenantName: tp?.userId?.name ?? null,
        tenantPhone: tp?.userId?.phone ?? null,
        unitNumber: unitNumberById.get(entry.unitId) ?? null,
        totalOverdue: roundMoney(entry.totalOverdue),
        oldestDueDate: entry.oldestDueDate,
        billCount: entry.billCount,
      };
    })
    .sort((a, b) => b.totalOverdue - a.totalOverdue);

  return { buildingId: building._id.toString(), buildingName: building.name, overdueTenants };
}

async function getRevenueTrend(req, { months = 6 } = {}) {
  const buildingFilter = { isArchived: false };
  const idFilter = scopedIdFilter(req.buildingScope);
  if (idFilter) buildingFilter._id = idFilter;
  const buildings = await Building.find(buildingFilter).select('_id').lean();
  const buildingIds = buildings.map((b) => b._id);

  const units = await Unit.find({ buildingId: trustedIn(buildingIds), isArchived: false })
    .select('_id')
    .lean();
  const unitIds = units.map((u) => u._id);

  const periods = trailingPeriods(months);
  const bills = await Bill.find({ unitId: trustedIn(unitIds), period: trustedIn(periods) })
    .select('period amount amountPaid')
    .lean();

  const byPeriod = new Map(periods.map((p) => [p, { period: p, totalBilled: 0, totalCollected: 0 }]));
  for (const bill of bills) {
    const entry = byPeriod.get(bill.period);
    if (!entry) continue;
    entry.totalBilled += bill.amount;
    entry.totalCollected += bill.amountPaid;
  }

  return {
    months: periods.map((p) => {
      const e = byPeriod.get(p);
      return { period: p, totalBilled: roundMoney(e.totalBilled), totalCollected: roundMoney(e.totalCollected) };
    }),
  };
}

module.exports = { getPortfolioReport, getBuildingReport, getOverdueTenants, getRevenueTrend };