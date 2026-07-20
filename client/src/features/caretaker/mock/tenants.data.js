
// Swap this module's exports for calls into services/tenant.service.js once ready.

export const MOCK_TENANTS = [
  {
    id: 't1',
    name: 'Grace Wanjiru',
    unit: 'A1',
    phone: '0712 345 678',
    email: 'grace.wanjiru@example.com',
    status: 'active',
    monthlyRent: 25000,
    moveInDate: '2025-02-01',
    nationalId: '30123456',
  },
  {
    id: 't5',
    name: 'Peter Karanja',
    unit: 'A5',
    phone: '0722 111 222',
    email: 'peter.karanja@example.com',
    status: 'active',
    monthlyRent: 25000,
    moveInDate: '2024-11-15',
    nationalId: '28987654',
  },
  {
    id: 't7',
    name: 'Susan Njeri',
    unit: 'A9',
    phone: '0733 555 999',
    email: '',
    status: 'pending',
    monthlyRent: 22000,
    moveInDate: '2026-07-01',
    nationalId: '34112233',
  },
];

// Stand-in for GET /tenants/:id/payments while the API is wired up.
export const MOCK_PAYMENT_HISTORY = {
  t1: [
    { id: 'p1', amount: 25000, method: 'M-Pesa', paidOn: '2026-07-03' },
    { id: 'p2', amount: 25000, method: 'M-Pesa', paidOn: '2026-06-02' },
  ],
  t5: [{ id: 'p3', amount: 25000, method: 'Bank Transfer', paidOn: '2026-05-28' }],
  t7: [],
};

// Stand-in for GET /buildings/:buildingId/units?status=vacant while the API is wired up.
export const MOCK_VACANT_UNITS = [
  { id: 'u1', label: 'A2 — Sunrise Apartments' },
  { id: 'u2', label: 'A6 — Sunrise Apartments' },
  { id: 'u3', label: 'B3 — Green View' },
];