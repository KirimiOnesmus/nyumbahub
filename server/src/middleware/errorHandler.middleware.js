'use strict';

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
// eslint-disable-next-line no-unused-vars
function notFoundHandler(req, res, next) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let appErr = err;


  if (err.name === 'ValidationError') {
    appErr = AppError.badRequest('Validation failed', formatMongooseValidation(err));
  } else if (err.code === 11000) {
    appErr = AppError.conflict('A resource with these unique fields already exists');
  } else if (err.name === 'CastError') {
    appErr = AppError.badRequest('Invalid identifier format');
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    appErr = AppError.unauthorized('Invalid or expired token');
  } else if (!(err instanceof AppError)) {
    appErr = new AppError('Internal server error', 500, 'INTERNAL_ERROR');
  }

  const isServerError = (appErr.statusCode || 500) >= 500;

 
  logger[isServerError ? 'error' : 'warn'](
    {
      err: { message: err.message, stack: err.stack, name: err.name },
      requestId: req.id,
      userId: req.user?.id,
      path: req.originalUrl,
      method: req.method,
    },
    'Request error'
  );

  res.status(appErr.statusCode || 500).json({
    success: false,
    error: {
      code: appErr.code || 'INTERNAL_ERROR',
  
      message: isServerError ? 'An unexpected error occurred' : appErr.message,
      ...(appErr.details && !isServerError ? { details: appErr.details } : {}),
    },
  });
}

function formatMongooseValidation(err) {
  return Object.values(err.errors || {}).map((e) => ({ field: e.path, message: e.message }));
}

module.exports = { errorHandler, notFoundHandler };