'use strict';

const AppError = require('../utils/AppError');

function requireRole(...allowedRoles) {
  return function roleCheck(req, res, next) {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { requireRole };