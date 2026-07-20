// src/features/caretakers/bills/bills.data.js
// Stand-in for GET /buildings/:buildingId/bills + GET /bills/:id while the API is wired up.
// Swap these exports for calls into a bill.service.js once ready.

export const MOCK_BILLS = [
  {
    id: 'bl1',
    tenantId: 't1',
    tenantName: 'Grace Wanjiru',
    unit: 'A1',
    type: 'Rent',
    amount: 25000,
    amountPaid: 25000,
    dueDate: '2026-07-05',
    status: 'paid',
  },
  {
    id: 'bl2',
    tenantId: 't5',
    tenantName: 'Peter Karanja',
    unit: 'A5',
    type: 'Rent',
    amount: 25000,
    amountPaid: 0,
    dueDate: '2026-06-25',
    status: 'overdue',
  },
  {
    id: 'bl3',
    tenantId: 't7',
    tenantName: 'Susan Njeri',
    unit: 'B1',
    type: 'Rent',
    amount: 22000,
    amountPaid: 10000,
    dueDate: '2026-07-10',
    status: 'partial',
  },
  {
    id: 'bl4',
    tenantId: 't1',
    tenantName: 'Grace Wanjiru',
    unit: 'A1',
    type: 'Water',
    amount: 1200,
    amountPaid: 0,
    dueDate: '2026-07-15',
    status: 'unpaid',
  },
];

export const BILL_TYPES = ['Rent', 'Water', 'Electricity', 'Garbage', 'Service Charge', 'Other'];

// Stand-in for GET /buildings/:buildingId/tenants?status=active while the API is wired up
// (shared with AddBills' tenant select).
export const MOCK_ACTIVE_TENANTS = [
  { id: 't1', label: 'Grace Wanjiru — Unit A1' },
  { id: 't5', label: 'Peter Karanja — Unit A5' },
  { id: 't7', label: 'Susan Njeri — Unit B1' },
];