'use strict';

const { scheduleMonthlyRentGeneration } = require('./monthlyRentGeneration.job');
const { scheduleMonthlyRentReminders } = require('./rentReminderNotification.job');
const logger = require('../utils/logger');

let jobsStarted = false;

function startScheduledJobs() {
  scheduleMonthlyRentGeneration();
  scheduleMonthlyRentReminders();
  jobsStarted = true;
  logger.info(
    {},
    'Scheduled jobs registered: monthly rent generation (1st, 00:05) and rent reminders (6th, 00:05), Africa/Nairobi time.'
  );
}

// Used by the admin system-health check to report real status instead of
// assuming jobs are running just because the process is up.
function areJobsRunning() {
  return jobsStarted;
}

module.exports = { startScheduledJobs, areJobsRunning };