
import {
  LuLayoutDashboard,
  LuBuilding2,
  LuDoorOpen,
  LuUsers,
  LuUserRound,
  LuWallet,
  LuTrendingUp,
  LuFileChartColumn,
  LuBell,
  LuSettings,
  LuReceipt,
  LuMegaphone,
  LuHandCoins,
  LuShieldCheck,
  LuActivity
} from 'react-icons/lu';

export const OWNER_NAV_ITEMS = [
  { to: '/owner', label: 'Dashboard', icon: LuLayoutDashboard, end: true },
  { to: '/owner/buildings', label: 'Buildings', icon: LuBuilding2 },
  { to: '/owner/caretakers', label: 'Caretakers', icon: LuUsers },
  { to: '/owner/tenants', label: 'Tenants', icon: LuUserRound },
  { to: '/owner/revenue', label: 'Revenue', icon: LuTrendingUp },
  { to: '/owner/reports', label: 'Reports', icon: LuFileChartColumn },
  { to: '/owner/notifications', label: 'Notifications', icon: LuBell },
];

export const OWNER_SETTINGS_ITEM = { to: '/owner/settings', label: 'Settings', icon: LuSettings };

export const CARETAKER_NAV_ITEMS = [
  { to: '/caretaker', label: 'Dashboard', icon: LuLayoutDashboard, end: true },
  { to: '/caretaker/tenants', label: 'Tenants', icon: LuUserRound },
  { to: '/caretaker/units', label: 'Units', icon: LuDoorOpen },
  { to: '/caretaker/bills', label: 'Bills', icon: LuReceipt },
  { to: '/caretaker/expenses', label: 'Expenses', icon: LuHandCoins  },
  { to: '/caretaker/payments', label: 'Payments', icon: LuWallet },
  { to: '/caretaker/announcements', label: 'Announcements', icon: LuMegaphone },
  { to: '/caretaker/reports', label: 'Reports', icon: LuFileChartColumn },
];

export const CARETAKER_SETTINGS_ITEM = { to: '/caretaker/settings', label: 'Settings', icon: LuSettings };


export const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LuLayoutDashboard, end: true },
  { to: '/admin/owners', label: 'Owners', icon: LuBuilding2 },
  { to: '/admin/caretakers', label: 'Caretakers', icon: LuUsers },
  { to: '/admin/activity', label: 'System Activity', icon: LuActivity },
];

export const ADMIN_SETTINGS_ITEM = { to: '/admin/settings', label: 'Settings', icon: LuShieldCheck };
