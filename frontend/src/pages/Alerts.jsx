import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, PackageX, Bell, ChevronRight, RefreshCw, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const Alerts = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/brands`, config);
      setBrands(res.data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const outOfStock = brands.filter(b => b.currentStock <= 0);
  const lowStock   = brands.filter(b => b.currentStock > 0 && b.currentStock <= b.minStockAlert);
  const healthy    = brands.filter(b => b.currentStock > b.minStockAlert);

  const getImageUrl = (url) => {
    if (!url || url.includes('source.unsplash.com')) return 'https://placehold.co/400x300?text=Brand+Image';
    return url;
  };

  if (loading) {
    return (
      <PageTransition className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-bg-secondary rounded-lg w-1/3"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-bg-secondary rounded-[18px]"></div>)}
        </div>
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-bg-secondary rounded-[18px]"></div>)}
      </PageTransition>
    );
  }

  const BrandRow = ({ brand, type }) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate(`/brand/${brand._id}`)}
      className="flex items-center gap-4 p-4 rounded-[16px] border bg-white cursor-pointer group transition-shadow hover:shadow-md"
      style={{
        borderColor: type === 'out' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)',
        backgroundColor: type === 'out' ? 'rgba(254,242,242,0.6)' : 'rgba(255,251,235,0.6)'
      }}
    >
      <div className="w-12 h-12 rounded-[12px] overflow-hidden shrink-0 border border-white shadow-sm">
        <img
          src={getImageUrl(brand.image)}
          alt={brand.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=No+Img'; }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text-primary truncate">{brand.name}</p>
        <p className="text-xs font-medium text-text-secondary truncate">{brand.variant}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xl font-black ${type === 'out' ? 'text-error' : 'text-warning'}`}>
          {brand.currentStock}
        </p>
        <p className="text-xs text-text-secondary font-medium">bags left</p>
      </div>
      <ChevronRight size={18} className="text-text-secondary/50 group-hover:text-text-secondary transition-colors shrink-0" />
    </motion.div>
  );

  return (
    <PageTransition className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Alerts</h1>
          <p className="text-sm text-text-secondary mt-1">Stock levels that need attention</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fetchBrands(true)}
          disabled={refreshing}
          className="p-2.5 bg-bg-secondary hover:bg-border/50 text-text-secondary rounded-xl transition-colors border border-border"
          title="Refresh"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </motion.button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="premium-card p-4 flex flex-col items-center text-center border-2 border-error/20"
        >
          <PackageX size={22} className="text-error mb-1" />
          <p className="text-3xl font-black text-error">{outOfStock.length}</p>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Out of Stock</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="premium-card p-4 flex flex-col items-center text-center border-2 border-warning/20"
        >
          <AlertTriangle size={22} className="text-warning mb-1" />
          <p className="text-3xl font-black text-warning">{lowStock.length}</p>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Low Stock</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="premium-card p-4 flex flex-col items-center text-center border-2 border-success/20"
        >
          <Package size={22} className="text-success mb-1" />
          <p className="text-3xl font-black text-success">{healthy.length}</p>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Healthy</p>
        </motion.div>
      </div>

      {/* All clear */}
      {outOfStock.length === 0 && lowStock.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="premium-card p-12 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <Bell size={30} className="text-success" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">All Good!</h3>
          <p className="text-sm text-text-secondary">All brands have sufficient stock. No alerts at this time.</p>
        </motion.div>
      )}

      {/* Out of Stock Section */}
      <AnimatePresence>
        {outOfStock.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
              <h2 className="text-sm font-bold text-error uppercase tracking-widest">
                Out of Stock ({outOfStock.length})
              </h2>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2">
              {outOfStock.map(brand => (
                <BrandRow key={brand._id} brand={brand} type="out" />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Low Stock Section */}
      <AnimatePresence>
        {lowStock.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-warning"></div>
              <h2 className="text-sm font-bold text-warning uppercase tracking-widest">
                Low Stock ({lowStock.length})
              </h2>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2">
              {lowStock.map(brand => (
                <BrandRow key={brand._id} brand={brand} type="low" />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default Alerts;
