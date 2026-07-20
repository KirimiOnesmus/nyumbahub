// src/features/caretakers/units/units.data.js
// Stand-in for GET /buildings/:buildingId/units + GET /units/:id while the API is wired up.
// Swap these exports for calls into a units.service.js once ready.

export const MOCK_UNITS = [
  {
    id: 'u_a1',
    unitNumber: 'A1',
    buildingId: 'b1',
    buildingName: 'Sunrise Apartments',
    type: '2 Bedroom',
    monthlyRent: 25000,
    status: 'occupied',
    tenantId: 't1',
    tenantName: 'Grace Wanjiru',
  },
  {
    id: 'u_a2',
    unitNumber: 'A2',
    buildingId: 'b1',
    buildingName: 'Sunrise Apartments',
    type: '1 Bedroom',
    monthlyRent: 18000,
    status: 'vacant',
    tenantId: null,
    tenantName: null,
  },
  {
    id: 'u_a5',
    unitNumber: 'A5',
    buildingId: 'b1',
    buildingName: 'Sunrise Apartments',
    type: '2 Bedroom',
    monthlyRent: 25000,
    status: 'occupied',
    tenantId: 't5',
    tenantName: 'Peter Karanja',
  },
  {
    id: 'u_a6',
    unitNumber: 'A6',
    buildingId: 'b1',
    buildingName: 'Sunrise Apartments',
    type: 'Bedsitter',
    monthlyRent: 12000,
    status: 'vacant',
    tenantId: null,
    tenantName: null,
  },
  {
    id: 'u_b1',
    unitNumber: 'B1',
    buildingId: 'b2',
    buildingName: 'Green View',
    type: '1 Bedroom',
    monthlyRent: 18000,
    status: 'occupied',
    tenantId: 't7',
    tenantName: 'Susan Njeri',
  },
  {
    id: 'u_b3',
    unitNumber: 'B3',
    buildingId: 'b2',
    buildingName: 'Green View',
    type: '2 Bedroom',
    monthlyRent: 24000,
    status: 'vacant',
    tenantId: null,
    tenantName: null,
  },
];

// Stand-in for GET /buildings while the API is wired up — shared with AddUnit's building select.
export const MOCK_BUILDINGS = [
  { id: 'b1', name: 'Sunrise Apartments' },
  { id: 'b2', name: 'Green View' },
];

// Stand-in for GET /units/:id/tenant-history while the API is wired up.
export const MOCK_UNIT_HISTORY = {
  u_a1: [{ id: 'h1', tenantName: 'Grace Wanjiru', moveIn: '2025-02-01', moveOut: null }],
  u_a5: [
    { id: 'h2', tenantName: 'Peter Karanja', moveIn: '2024-11-15', moveOut: null },
    { id: 'h3', tenantName: 'James Ouma', moveIn: '2023-06-01', moveOut: '2024-10-30' },
  ],
  u_b1: [{ id: 'h4', tenantName: 'Susan Njeri', moveIn: '2026-07-01', moveOut: null }],
  u_a2: [],
  u_a6: [],
  u_b3: [],
};