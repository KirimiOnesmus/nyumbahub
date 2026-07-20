'use strict';

module.exports = Object.freeze({
  CURRENCY: 'KES',

  ROLES: Object.freeze({
    ADMIN: 'admin',
    OWNER: 'owner',
    CARETAKER: 'caretaker',
    TENANT: 'tenant',
  }),

  ROLE_LABELS: Object.freeze({
    admin: 'Admin',
    owner: 'Owner',
    caretaker: 'Caretaker',
    tenant: 'Tenant',
  }),

  UNIT_STATUS: Object.freeze({
    VACANT: 'vacant',
    OCCUPIED: 'occupied',
  }),

  UNIT_TYPE: Object.freeze({
    SINGLE: 'single',
    BEDSITTER: 'bedsitter',
    STUDIO: 'studio',
    SHOP: 'shop',
    ONE_BEDROOM: 'oneBedroom',
    TWO_BEDROOM: 'twoBedroom',
    THREE_BEDROOM: 'threeBedroom',
    FOUR_BEDROOM_PLUS: 'fourBedroomPlus',
  }),

  UNIT_TYPE_LABELS: Object.freeze({
    single: 'Single',
    bedsitter: 'Bedsitter',
    studio: 'Studio',
    shop: 'Shop',
    oneBedroom: '1 Bedroom',
    twoBedroom: '2 Bedroom',
    threeBedroom: '3 Bedroom',
    fourBedroomPlus: '4+ Bedroom',
  }),

  TENANT_STATUS: Object.freeze({
    PENDING: 'pending',
    ACTIVE: 'active',
    MOVED_OUT: 'moved_out',
  }),

  BILL_TYPE: Object.freeze({
    RENT: 'rent',
    WATER: 'water',
    ELECTRICITY: 'electricity',
    GARBAGE: 'garbage',
    SERVICE_CHARGE: 'serviceCharge',
    OTHER: 'other',
  }),

  BILL_TYPE_LABELS: Object.freeze({
    rent: 'Rent',
    water: 'Water',
    electricity: 'Electricity',
    garbage: 'Garbage',
    serviceCharge: 'Service Charge',
    other: 'Other',
  }),

  BILL_STATUS: Object.freeze({
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
    PAID: 'paid',
    PAID_EARLY: 'paid_early',
    PAID_LATE: 'paid_late',
  }),

  PAYMENT_STATUS: Object.freeze({
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
  }),

  NOTIFICATION_STATUS: Object.freeze({
    QUEUED: 'queued',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
  }),

  // Phase 5: ANNOUNCEMENT 
  NOTIFICATION_MESSAGE_TYPE: Object.freeze({
    RENT_REMINDER: 'rent_reminder',
    PAYMENT_CONFIRMED: 'payment_confirmed',
    MANUAL_BILL_CREATED: 'manual_bill_created',
    ANNOUNCEMENT: 'announcement',
    PASSWORD_RESET: 'password_reset',
    INVITE: 'invite',
    WELCOME_CREDENTIALS: 'welcome_credentials',
  }),

  // Per-user-per-hour ceiling on manually triggered WhatsApp resends
  // (credentials / invite). Keeps a compromised or careless admin session
  // from being usable to spam a phone number or burn WhatsApp send quota.
  CREDENTIALS_RESEND_MAX_PER_HOUR: 5,

  ANNOUNCEMENT_MESSAGE_MAX_LENGTH: 1000,

  ID_TYPE: Object.freeze({
    NATIONAL_ID: 'NationalID',
    PASSPORT: 'Passport',
    MILITARY_ID: 'MilitaryID',
  }),

  IDENTITY_VERIFICATION_STATUS: Object.freeze({
    PENDING: 'pending',
    VERIFIED: 'verified',
    FAILED: 'failed',
    // Non-production only — external verification API was unreachable and a
    // developer explicitly opted into IDENTITY_VERIFICATION_DEV_BYPASS.
    // Kept distinct from VERIFIED so audit trails/reports never conflate the two.
    BYPASSED_DEV: 'bypassed_dev',
  }),

  UNIT_TYPES: Object.freeze(['Bedsitter', '1 Bedroom', '2 Bedroom', '3 Bedroom', 'Studio']),

  OWNER_INVITE_TOKEN_BYTES: 32,
  OWNER_INVITE_EXPIRY_HOURS: 72,

  INVITE_TOKEN_BYTES: 32,
  INVITE_EXPIRY_HOURS: 72,

  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCKOUT_MINUTES: 15,

  PASSWORD_RESET_TOKEN_BYTES: 32,
  PASSWORD_RESET_EXPIRY_MINUTES: 30,

  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  BILL_AMOUNT_MIN: 1,
  BILL_AMOUNT_MAX: 1_000_000,
  BILL_DUE_DATE_MIN_DAYS_AHEAD: 0,
  BILL_DUE_DATE_MAX_DAYS_AHEAD: 90,

  BILL_NOTES_MAX_LENGTH: 500,
  BULK_BILL_MAX: 100,

  RENT_GENERATION_DAY_OF_MONTH: 1,
  RENT_DUE_DAY_OF_MONTH: 15,
  RENT_REMINDER_DAY_OF_MONTH: 6,

  NOTIFICATION_MAX_ATTEMPTS: 3,
  NOTIFICATION_RETRY_BACKOFF_MS: Object.freeze([2000, 4000, 8000]),
  NOTIFICATION_SEND_CONCURRENCY: 5,

  PAYMENT_LINK_TOKEN_BYTES: 32,
  PAYMENT_LINK_NONRENT_TTL_DAYS: 30,

  EXPENSE_CATEGORY: Object.freeze({
    MAINTENANCE: 'maintenance',
    UTILITIES: 'utilities',
    SALARIES: 'salaries',
    OTHER: 'other',
  }),

  EXPENSE_CATEGORY_LABELS: Object.freeze({
    maintenance: 'Maintenance',
    utilities: 'Utilities',
    salaries: 'Salaries',
    other: 'Other',
  }),

  EXPENSE_AMOUNT_MIN: 1,
  EXPENSE_AMOUNT_MAX: 1_000_000,
  EXPENSE_DESCRIPTION_MAX_LENGTH: 500,
  // How far back a caretaker/owner may backdate dateIncurred. Bounds the
  // fraud/backfill window while still allowing legitimate late logging.
  EXPENSE_DATE_MAX_PAST_DAYS: 365,

  // Admin activity feed — actions we record to AuditLog. Both self-service
  // and admin-triggered resets use the same 'password_reset' value; the
  // human-readable `description` field (set at call time) is what
  // distinguishes them in the feed, not a separate action code.
  ACTIVITY_ACTION: Object.freeze({
    LOGIN: 'login',
    PASSWORD_CHANGE: 'password_change',
    PASSWORD_RESET: 'password_reset',
    PHONE_CHANGE: 'phone_change',
    CONFIG_UPDATE: 'config_update',
    USER_DELETED: 'user_deleted',
  }),
  ACTIVITY_LOG_RETENTION_DAYS: 90,
});