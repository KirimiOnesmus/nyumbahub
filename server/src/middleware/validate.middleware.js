'use strict';

const AppError = require('../utils/AppError');

function validate(schemas) {
 
  return function validateRequest(req, res, next) {

    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        return next(AppError.badRequest('Request validation failed', details));
      }
      next(err);
    }
  };
}

module.exports = { validate };