import { Outlet, NavLink } from 'react-router-dom';
import { Home, Receipt, BarChart2, Bell, Package, Search, Menu, User } from 'lucide-react';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const [hasAlerts, setHasAlerts] = useState(false);

  useEffect(() => {
    const fetchAlertStatus = async () => {
      try {
        if (!user?.token) return;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/brands`, config);
        const alertsExist = res.data.some(b => b.currentStock <= 0 || (b.currentStock > 0 && b.currentStock <= (b.minStockAlert || 0)));
        setHasAlerts(alertsExist);
      } catch (error) {
        console.error("Failed to check alert status:", error);
      }
    };
    
    fetchAlertStatus();
    const interval = setInterval(fetchAlertStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  const NavItems = () => (
    <>
      <NavLink to="/" className={({ isActive }) => `flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary font-medium'}`}>
        <Home size={22} />
        <span className="md:block hidden tracking-wide">Dashboard</span>
      </NavLink>
      <NavLink to="/billing" className={({ isActive }) => `flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary font-medium'}`}>
        <Receipt size={22} />
        <span className="md:block hidden tracking-wide">Billing</span>
      </NavLink>
      <NavLink to="/summary" className={({ isActive }) => `flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary font-medium'}`}>
        <BarChart2 size={22} />
        <span className="md:block hidden tracking-wide">Summary</span>
      </NavLink>
      <NavLink to="/notifications" className={({ isActive }) => `flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary font-medium'}`}>
        <div className="relative">
          <Bell size={22} />
          {hasAlerts && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error border-2 border-white rounded-full"></span>}
        </div>
        <span className="md:block hidden tracking-wide">Alerts</span>
      </NavLink>
    </>
  );

  return (
    <div className="flex h-screen bg-bg-secondary overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] bg-bg-primary border-r border-border shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 flex items-center space-x-4">
          <div className="bg-primary p-2.5 rounded-[14px] shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]">
            <Package className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold text-text-primary tracking-tight">Sanjeevani Veeresh</span>
        </div>
        
        <div className="flex-1 px-5 py-6 space-y-2 overflow-y-auto">
          <div className="text-[11px] font-bold text-text-secondary/60 mb-6 uppercase tracking-[0.15em] pl-3">Main Menu</div>
          <NavItems />
        </div>
        
        <div className="p-5 border-t border-border m-5 rounded-[18px] bg-bg-secondary flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{user?.name}</p>
              <p className="text-xs font-medium text-text-secondary mt-0.5">Administrator</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 text-text-secondary hover:text-error hover:bg-error-light rounded-lg transition-colors" title="Log out">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative pb-[80px] md:pb-0">
        

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto w-full h-full scrollbar-hide">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation (Minimum 48px touch targets) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-bg-primary border-t border-border pb-safe z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center h-[72px] px-2">
          <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}>
            <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center w-[48px] h-[48px]">
              <Home size={24} />
              <span className="text-[11px] mt-1 font-semibold tracking-wide">Home</span>
            </motion.div>
          </NavLink>
          
          <NavLink to="/billing" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}>
            <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center w-[48px] h-[48px]">
              <Receipt size={24} />
              <span className="text-[11px] mt-1 font-semibold tracking-wide">Billing</span>
            </motion.div>
          </NavLink>
          
          <NavLink to="/summary" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}>
            <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center w-[48px] h-[48px]">
              <BarChart2 size={24} />
              <span className="text-[11px] mt-1 font-semibold tracking-wide">Summary</span>
            </motion.div>
          </NavLink>

          <NavLink to="/notifications" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}>
            <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center w-[48px] h-[48px]">
              <div className="relative">
                <Bell size={24} />
                {hasAlerts && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-error border-2 border-white rounded-full"></span>}
              </div>
              <span className="text-[11px] mt-1 font-semibold tracking-wide">Alerts</span>
            </motion.div>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default Layout;

