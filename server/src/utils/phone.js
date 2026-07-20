'use strict';

function normalizeKenyanPhone(input) {
  if (typeof input !== 'string') return null;
  const stripped = input.replace(/[\s-]/g, '');

  if (/^\+254[17]\d{8}$/.test(stripped)) {
    return stripped;
  }
  if (/^254[17]\d{8}$/.test(stripped)) {
    return `+${stripped}`;
  }
  if (/^0[17]\d{8}$/.test(stripped)) {
    return `+254${stripped.slice(1)}`;
  }
  if (/^[17]\d{8}$/.test(stripped)) {
    return `+254${stripped}`;
  }

  return null;
}

module.exports = { normalizeKenyanPhone };