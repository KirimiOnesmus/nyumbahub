'use strict';

const cron = require('node-cron');

const Bill = require('../models/Bill');
const Unit = require('../models/Unit');
const TenantProfile = require('../models/TenantProfile');

const logger = require('../utils/logger');
const { nairobiPeriodString, nairobiMidnightUTC } = require('../utils/nairobiTime');
const { BILL_TYPE, TENANT_STATUS, RENT_DUE_DAY_OF_MONTH } = require('../config/constants');

const BATCH_SIZE = 500;

async function generateMonthlyRentBills() {
  const period = nairobiPeriodString();
  const [year, month] = period.split('-').map(Number);
  const dueDate = nairobiMidnightUTC(year, month, RENT_DUE_DAY_OF_MONTH);

  let created = 0;
  let skippedExisting = 0;
  let failed = 0;
  let batch = [];

  async function flushBatch() {
    if (batch.length === 0) return;

    try {
      await Bill.insertMany(batch, { ordered: false });
      created += batch.length;
    } catch (err) {
  
      const writeErrors = err.writeErrors || [];

      for (const writeError of writeErrors) {
        if (writeError.code === 11000 || writeError.err?.code === 11000) {
          skippedExisting += 1;
        } else {
          failed += 1;
          logger.error(
            { errorMessage: writeError.errmsg || writeError.err?.errmsg || 'Unknown write error' },
            'Unexpected error creating a system rent bill.'
          );
        }
      }

      if (writeErrors.length === 0) {

        failed += batch.length;
        logger.error(
          { errorMessage: err.message },
          'Rent bill batch insert failed with no per-document detail.'
        );
      } else {
        created += batch.length - writeErrors.length;
      }
    }

    batch = [];
  }

  const cursor = TenantProfile.find({ status: TENANT_STATUS.ACTIVE }).cursor();

  for await (const tenantProfile of cursor) {
    const unit = await Unit.findOne({ _id: tenantProfile.unitId, isArchived: false }).select(
      'rentAmount'
    );
    if (!unit) continue; // unit archived or missing — nothing to bill this tenancy

    batch.push({
      unitId: unit._id,
      tenantId: tenantProfile._id,
      type: BILL_TYPE.RENT,
      amount: unit.rentAmount,
      period,
      dueDate,
      generatedBy: 'system',

    });

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }
  await flushBatch();

  logger.info(
    { period, created, skippedExisting, failed },
    'Monthly rent bill generation complete.'
  );

  return { period, created, skippedExisting, failed };
}


function scheduleMonthlyRentGeneration() {
  cron.schedule(
    '5 0 1 * *',
    () => {
      generateMonthlyRentBills().catch((err) => {
        logger.error({ errorMessage: err.message }, 'Monthly rent generation job crashed.');
      });
    },
    { timezone: 'Africa/Nairobi' }
  );
}

module.exports = { generateMonthlyRentBills, scheduleMonthlyRentGeneration };