"use strict";

const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate.middleware");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  loginLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimit.middleware");
const {
  loginSchema,
  logoutSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateMeSchema,
} = require("../utils/validators/auth.validators");

const router = Router();

router.post(
  "/login",
  loginLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

router.post("/refresh-token", authController.refresh);

router.get("/me", requireAuth, authController.me);

router.patch(
  "/me",
  requireAuth,
  validate({ body: updateMeSchema }),
  authController.updateMe,
);

router.post(
  "/logout",
  requireAuth,
  validate({ body: logoutSchema }),
  authController.logout,
);

router.post(
  "/request-password-reset",
  passwordResetLimiter,
  validate({ body: requestPasswordResetSchema }),
  authController.requestPasswordReset,
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

router.post(
  "/change-password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

module.exports = router;