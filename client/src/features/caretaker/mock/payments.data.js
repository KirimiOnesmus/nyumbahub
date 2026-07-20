// src/features/caretakers/payments/payments.data.js
// Stand-in for GET /buildings/:buildingId/payments + GET /payments/:id while the API is wired up.
// Swap these exports for calls into services/payment.service.js once ready.

export const PAYMENT_METHODS = ['M-Pesa', 'Bank Transfer', 'Cash'];

export const MOCK_PAYMENTS = [
  {
    id: 'p1',
    tenantId: 't1',
    tenantName: 'Grace Wanjiru',
    unit: 'A1',
    billId: 'bl1',
    billType: 'Rent',
    amount: 25000,
    method: 'M-Pesa',
    reference: 'QJK7X2P9M1',
    paidOn: '2026-07-03',
  },
  {
    id: 'p2',
    tenantId: 't5',
    tenantName: 'Peter Karanja',
    unit: 'A5',
    billId: 'bl2',
    billType: 'Rent',
    amount: 25000,
    method: 'M-Pesa',
    reference: 'QJK5R8T2N4',
    paidOn: '2026-07-02',
  },
  {
    id: 'p3',
    tenantId: 't7',
    tenantName: 'Susan Njeri',
    unit: 'B1',
    billId: 'bl3',
    billType: 'Rent',
    amount: 10000,
    method: 'Bank Transfer',
    reference: 'BT-220719',
    paidOn: '2026-06-04',
  },
];

// Stand-in for GET /buildings/:buildingId/tenants?status=active while the API is wired up
// (shared select for AddPayments — same shape as bills.data.js's MOCK_ACTIVE_TENANTS).
export const MOCK_ACTIVE_TENANTS = [
  { id: 't1', label: 'Grace Wanjiru — Unit A1' },
  { id: 't5', label: 'Peter Karanja — Unit A5' },
  { id: 't7', label: 'Susan Njeri — Unit B1' },
];

// Stand-in for GET /tenants/:tenantId/bills?status=unpaid,partial,overdue while the API is wired up.
export const MOCK_OUTSTANDING_BILLS = {
  t1: [{ id: 'bl4', label: 'Water — KES 1,200 due Jul 15' }],
  t5: [{ id: 'bl2', label: 'Rent — KES 25,000 due Jun 25 (overdue)' }],
  t7: [{ id: 'bl3', label: 'Rent — KES 12,000 balance due Jul 10' }],
};