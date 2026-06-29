import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertTriangle, FileText, ChevronRight, Inbox, Clock, Edit2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { formatDistanceToNow } from 'date-fns';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const SkeletonLoader = () => (
  <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
       <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
       <div className="h-12 bg-slate-200 rounded-full w-full md:w-1/2"></div>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {[1,2,3,4].map(i => (
        <div key={i} className="h-32 bg-slate-200 rounded-[18px]"></div>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse mt-8">
      {[1,2,3,4,5,6,7,8].map(i => (
        <div key={i} className="h-64 bg-slate-200 rounded-[18px]"></div>
      ))}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [brands, setBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch();
      } else {
        setSearchResults(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDashboardData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const [statsRes, brandsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/summary/dashboard`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/brands`, config)
      ]);
      setStats(statsRes.data);
      setBrands(brandsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/search?q=${searchQuery}`, config);
      setSearchResults(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <SkeletonLoader />;

  const displayBrands = searchResults ? searchResults.brands : brands;

  const getImageUrl = (url) => {
    if (!url || url.includes('source.unsplash.com')) {
      return 'https://placehold.co/400x300?text=Brand+Image';
    }
    return url;
  };

  return (
    <PageTransition className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto pb-24 md:pb-8">
      {/* Header & Search */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sanjeevani Agencies</h1>
          <p className="text-sm text-slate-500">Inventory & Billing Management</p>
        </div>

        <div className="relative flex-1 max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search brands, bills, parties..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-full py-3.5 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 transition-all text-sm md:text-base font-medium"
          />
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/brand/add')} 
          className="hidden md:flex btn-primary"
        >
          <Plus size={20} className="mr-2" /> Add Brand
        </motion.button>
      </motion.div>

      {/* Floating Add Button Mobile */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/brand/add')} 
        className="md:hidden fixed bottom-24 right-4 z-50 p-4 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-500/40"
      >
        <Plus size={24} />
      </motion.button>

      <motion.div 
        key="dashboard-content"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-10"
      >


        {/* Bill Search Results */}
        {searchQuery && searchResults?.bills?.length > 0 && (
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Bills matching "{searchQuery}"</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.bills.map(bill => (
                <Link key={bill._id} to={`/bills/${bill._id}`} className="premium-card p-5 group flex items-center justify-between cursor-pointer block">
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-bold text-slate-900 text-lg">{bill.billNumber}</span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{bill.totalQuantity} Bags</span>
                    </div>
                    <p className="text-sm text-slate-500">{bill.partyName} <span className="mx-1">•</span> {bill.millName}</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Brand Cards Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {searchQuery ? `Brands matching "${searchQuery}"` : 'Inventory Overview'}
            </h2>
          </div>
          
          {displayBrands.length > 0 ? (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayBrands.map(brand => (
                <motion.div key={brand._id} variants={itemVariants}>
                  <Link to={`/brand/${brand._id}`} className="premium-card overflow-hidden group flex flex-col h-full block">
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      <motion.img 
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        src={getImageUrl(brand.image)} 
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = 'https://placehold.co/400x300?text=Image+Unavailable';
                        }}
                        alt={brand.name} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      />
                      <div className="absolute top-3 right-3">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center space-x-1 backdrop-blur-md ${brand.currentStock <= 0 ? 'bg-red-500/90 text-white' : brand.currentStock <= brand.minStockAlert ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
                          {brand.currentStock} Bags
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 text-lg line-clamp-1 leading-tight">{brand.name}</h3>
                      </div>
                      <p className="text-sm font-medium text-slate-500">{brand.variant}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="premium-card p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No brands found</h3>
              <p className="text-slate-500 text-sm">We couldn't find any items matching your criteria.</p>
            </motion.div>
          )}
        </div>

      </motion.div>
    </PageTransition>
  );
};

export default Dashboard;

