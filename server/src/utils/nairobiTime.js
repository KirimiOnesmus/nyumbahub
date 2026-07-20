'use strict';


const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

function nairobiDateParts(date) {
  const shifted = new Date(date.getTime() + NAIROBI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function nairobiDateOnlyString(date) {
  const { year, month, day } = nairobiDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}


function nairobiPeriodString(date = new Date()) {
  const { year, month } = nairobiDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function nairobiMidnightUTC(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
}

module.exports = {
  nairobiDateParts,
  nairobiDateOnlyString,
  nairobiPeriodString,
  nairobiMidnightUTC,
};