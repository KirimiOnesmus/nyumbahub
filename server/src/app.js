"use strict";
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const { randomUUID } = require("crypto");
const pinoHttp = require("pino-http");

const env = require("./config/env");
const logger = require("./utils/logger");
const { globalLimiter } = require("./middleware/rateLimit.middleware");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/errorHandler.middleware");

const authRoutes = require("./routes/auth.routes");
const ownerRoutes = require("./routes/owner.routes");
const buildingRoutes = require("./routes/building.routes");
const caretakerRoutes = require("./routes/caretaker.routes");
const tenantRoutes = require("./routes/tenant.routes");
const billRoutes = require("./routes/bill.routes");
const expenseRoutes = require("./routes/expense.routes");
const publicBillRoute = require("./routes/publicBillPayment.routes");
const unitRoutes = require("./routes/unit.routes");
const paymentRoutes = require("./routes/payment.routes");
const webhookRoutes = require("./routes/webhook.routes");
const announcementRoutes = require('./routes/announcement.routes');
const reportRoutes = require('./routes/report.routes');
const adminRoutes = require('./routes/admin.routes');


const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

//  Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);
app.use(
  cors({
    origin: env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()),

    credentials: true,

    methods: ["GET", "POST", "PATCH", "DELETE"],
  }),
);

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);
app.use(compression());
app.use(
  express.json({
    limit: "100kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser(env.COOKIE_SECRET));
app.use((req, res, next) => {
  // Meta's WhatsApp webhook verification handshake requires literal dotted
  // query param names (hub.mode, hub.verify_token, hub.challenge) — that's
  // Meta's spec, not ours, and can't be changed. express-mongo-sanitize
  // strips keys containing "." by default, which silently breaks this
  // specific handshake. Every other route, including this same webhook's
  // POST status body, stays fully sanitized.
  if (req.method === 'GET' && req.path === '/api/v1/webhooks/whatsapp/status') {
    return next();
  }
  return mongoSanitize()(req, res, next);
});
app.use(hpp());
app.use(globalLimiter);

//  Routes
// Public/unauthenticated routes are mounted FIRST and deliberately isolated from the authenticated routers below.

app.use("/api/v1", webhookRoutes);
app.use("/api/v1", publicBillRoute);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", ownerRoutes);
app.use("/api/v1", buildingRoutes);
app.use("/api/v1", caretakerRoutes);
app.use("/api/v1", tenantRoutes);
app.use("/api/v1", billRoutes);
app.use("/api/v1", expenseRoutes);
app.use("/api/v1", unitRoutes);
app.use("/api/v1", paymentRoutes);
app.use('/api/v1', announcementRoutes);
app.use('/api/v1', reportRoutes);
app.use('/api/v1', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;