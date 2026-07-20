// src/features/caretakers/announcements/announcements.data.js
// Stand-in for GET /buildings/:buildingId/announcements while the API is wired up.
// Swap these exports for calls into services/notification.service.js once ready.

export const MOCK_ANNOUNCEMENTS = [
  {
    id: 'a1',
    title: 'Water Shutdown — Thursday',
    body: 'Water will be off building-wide from 9am to 3pm on Thursday for tank cleaning. Please store water in advance.',
    audience: 'Sunrise Apartments',
    audienceId: 'b1',
    postedOn: '2026-07-05',
  },
  {
    id: 'a2',
    title: 'Rent Due Reminder',
    body: 'This is a reminder that rent for July is due by the 5th. Bills already sent are visible under Payments.',
    audience: 'All Buildings',
    audienceId: 'all',
    postedOn: '2026-07-01',
  },
  {
    id: 'a3',
    title: 'Parking Lot Repainting',
    body: 'The parking lot will be repainted this weekend. Please park on the street Saturday and Sunday.',
    audience: 'Green View',
    audienceId: 'b2',
    postedOn: '2026-06-28',
  },
];

// Stand-in for GET /buildings while the API is wired up (shared with AddAnnouncements' audience select).
// The 'tenant' entry is a sentinel value, not a real building — selecting it reveals a tenant picker.
export const MOCK_AUDIENCES = [
  { id: 'all', label: 'All Buildings' },
  { id: 'b1', label: 'Sunrise Apartments' },
  { id: 'b2', label: 'Green View' },
  { id: 'tenant', label: 'Specific Tenant' },
];

// Stand-in for GET /buildings/:buildingId/tenants (active only) while the API is wired up.
export const MOCK_ACTIVE_TENANTS = [
  { id: 't1', label: 'Grace Wanjiru — Unit A1', buildingId: 'b1' },
  { id: 't5', label: 'Peter Karanja — Unit A5', buildingId: 'b1' },
  { id: 't7', label: 'Susan Njeri — Unit B1', buildingId: 'b2' },
];