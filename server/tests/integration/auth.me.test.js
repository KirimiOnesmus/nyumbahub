'use strict';

// Mocks must be declared before requiring the app so every module that
// pulls in User/token.service gets the mocked version, without needing a
// real MongoDB connection for this smoke test.
jest.mock('../../src/models/User');
jest.mock('../../src/services/token.service');

const request = require('supertest');
const User = require('../../src/models/User');
const { verifyAccessToken } = require('../../src/services/token.service');

const app = require('../../src/app');

const ACTIVE_USER_ID = '507f1f77bcf86cd799439011';

const baseUserDoc = (overrides = {}) => ({
  _id: { toString: () => ACTIVE_USER_ID },
  role: 'owner',
  name: 'Jane Wanjiru',
  phone: '+254712345678',
  email: 'jane@example.com',
  isActive: true,
  isEmailVerified: true,
  mfaEnabled: false,
  passwordHash: 'should-never-reach-the-client',
  failedLoginAttempts: 0,
  lockedUntil: null,
  ...overrides,
});

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests with no bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid/expired token', async () => {
    verifyAccessToken.mockImplementation(() => {
      throw new Error('invalid');
    });
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('returns the sanitized current user for a valid token', async () => {
    verifyAccessToken.mockReturnValue({ sub: ACTIVE_USER_ID });

    // requireAuth uses .lean(), the controller's getMe() uses a plain
    // findById() — both need to resolve for this test.
    User.findById.mockImplementation(() => ({
      lean: () => Promise.resolve(baseUserDoc()),
      then: (resolve) =>
        Promise.resolve({ ...baseUserDoc(), toJSON: () => sanitizedUser() }).then(resolve),
    }));

    const sanitizedUser = () => {
      const doc = baseUserDoc();
      const { passwordHash, failedLoginAttempts, lockedUntil, ...safe } = doc;
      return { ...safe, id: ACTIVE_USER_ID };
    };

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ name: 'Jane Wanjiru', role: 'owner' });
    // Never leak sensitive fields to the client.
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.failedLoginAttempts).toBeUndefined();
    expect(res.body.data.user.lockedUntil).toBeUndefined();
  });

  it('rejects a valid token for a deactivated account', async () => {
    verifyAccessToken.mockReturnValue({ sub: ACTIVE_USER_ID });
    User.findById.mockImplementation(() => ({
      lean: () => Promise.resolve(baseUserDoc({ isActive: false })),
      then: (resolve) => Promise.resolve(baseUserDoc({ isActive: false })).then(resolve),
    }));

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(401);
  });
});
