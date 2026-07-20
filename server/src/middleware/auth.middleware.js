'use strict';

const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../services/token.service');

function extractToken(req) {
  const header = req.headers.authorization; 
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return null;
}






async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw AppError.unauthorized('Missing bearer token');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }

    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Account not found or deactivated');
    }
    
    req.user = { id: user._id.toString(), role: user.role, phone: user.phone };
    next();
  } catch (err) {
    next(err);
  }
}

//Add admin
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions for this action'));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole};