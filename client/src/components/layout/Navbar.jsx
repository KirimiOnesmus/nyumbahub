import { LuSearch, LuBell, LuCircleHelp, LuMenu } from 'react-icons/lu';
import { getRoleLabel, getInitials } from '../../utils/userDisplay.js';


const Navbar = ({ user, onMenuClick }) => {
  const name = user?.name?.trim() || 'Account';
  const roleLabel = getRoleLabel(user?.role);
  const initials = getInitials(user?.name);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="h-16 px-4 md:px-8 flex items-center justify-between gap-3 md:gap-6">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-500
           hover:bg-canvas hover:text-brand-700 transition-colors shrink-0 cursor-pointer"
        >
          <LuMenu />
        </button>

        <label className="relative flex-1 max-w-md">
          <LuSearch
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search buildings, tenants…"
            aria-label="Search buildings and tenants"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-transparent text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
          />
        </label>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <button
            type="button"
            aria-label="Notifications"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 
            hover:bg-canvas hover:text-brand-700 transition-colors cursor-pointer"
          >
            <LuBell />
          </button>
          <button
            type="button"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-600
             hover:text-brand-700 transition-colors px-2 cursor-pointer"
          >
            <LuCircleHelp aria-hidden="true" />
            Support
          </button>

          <div className="flex items-center gap-3 pl-2 md:pl-3 md:ml-1 md:border-l md:border-slate-200 hover:cursor-pointer hover:bg-green-50 transition-colors rounded-xl py-1.5 px-2">
            <div className="text-right leading-tight hidden md:block">
              <p className="text-sm font-semibold text-slate-800">{name}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
            <div
              className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0"
              aria-hidden="true"
            >
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
