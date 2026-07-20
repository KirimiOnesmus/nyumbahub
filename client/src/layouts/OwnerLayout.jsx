import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';
import { OWNER_NAV_ITEMS, OWNER_SETTINGS_ITEM } from '../components/constast/Navigation.js';
import { useAuth } from '../context/AuthContext.jsx';

const OwnerLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false); 
  const { pathname } = useLocation();
  const { user } = useAuth();


  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);


  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex bg-canvas">
      <div className="print:hidden">
        <Sidebar
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          navItems={OWNER_NAV_ITEMS}
          settingsItem={OWNER_SETTINGS_ITEM}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="print:hidden">
          <Navbar user={user} onMenuClick={() => setMenuOpen(true)} />
        </div>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
        <div className="print:hidden">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default OwnerLayout;