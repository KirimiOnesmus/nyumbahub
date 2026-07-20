import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LuCircleHelp, LuLogOut, LuX, LuLoaderCircle } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext.jsx';

const NavItem = ({ to, label, icon: Icon, end, onNavigate }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        isActive
          ? 'bg-brand-700 text-white'
          : 'text-slate-600 hover:bg-canvas hover:text-brand-700'
      }`
    }
  >
    <Icon className="text-base shrink-0" aria-hidden="true" />
    {label}
  </NavLink>
);

const Sidebar = ({
  open,
  onClose,
  navItems = [],
  settingsItem,
  brandTitle = 'NyumbaHub',
  brandSubtitle = 'Management Portal',
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return; 
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      
      setLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 shrink-0 bg-white border-r border-slate-200 h-screen flex flex-col
          fixed top-0 left-0 z-50 transition-transform duration-200 ease-out
          lg:sticky lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-700">{brandTitle}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{brandSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer hover:bg-canvas hover:text-slate-600 transition-colors"
          >
            <LuX />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto thin-scrollbar px-4 py-2 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onClose} />
          ))}

          {settingsItem && (
            <div className="pt-4 mt-4 border-t border-slate-200">
              <NavItem {...settingsItem} onNavigate={onClose} />
            </div>
          )}
        </nav>

        <div className="px-4 pb-5 space-y-2">
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-200">
            <button
              type="button"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 cursor-pointer hover:bg-canvas hover:text-slate-700 transition-colors"
            >
              <LuCircleHelp aria-hidden="true" />
              Help Center
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-busy={loggingOut}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loggingOut ? (
                <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <LuLogOut aria-hidden="true" />
              )}
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
