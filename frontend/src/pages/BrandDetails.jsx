import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, PlusCircle, History, PackageOpen, TrendingUp, TrendingDown, Save } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const BrandDetails = () => {
  const { id } = useParams();
  const [brand, setBrand] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stockInAmount, setStockInAmount] = useState('');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBrandDetails();
    fetchTransactions();
  }, [id]);

  const fetchBrandDetails = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`http://localhost:5001/api/brands/${id}`, config);
      setBrand(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`http://localhost:5001/api/brands/${id}/transactions`, config);
      setTransactions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStockIn = async (e) => {
    e.preventDefault();
    if (!stockInAmount || stockInAmount <= 0) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`http://localhost:5001/api/brands/${id}/stock-in`, { quantity: Number(stockInAmount) }, config);
      setStockInAmount('');
      fetchBrandDetails();
      fetchTransactions();
    } catch (error) {
      console.error(error);
      alert('Failed to add stock');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`http://localhost:5001/api/brands/${id}`, config);
        navigate('/');
      } catch (error) {
        console.error(error);
      }
    }
  };

  if (!brand) return <div className="p-8 text-center text-text-secondary">Loading...</div>;

  return (
    <PageTransition className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      
      {/* Header Profile Card */}
      <div className="premium-card p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center relative">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-text-secondary hover:text-text-primary bg-bg-secondary rounded-full transition-colors"
          title="Go Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="w-32 h-32 md:w-40 md:h-40 rounded-[20px] overflow-hidden shadow-sm shrink-0 border border-border">
          <img 
            src={brand.image} 
            alt={brand.name} 
            className="w-full h-full object-cover" 
            onError={(e) => { e.target.src = 'https://placehold.co/400x400/2563EB/FFFFFF?text=No+Image'; }}
          />
        </div>
        
        <div className="flex-1">
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold inline-block mb-3 tracking-widest uppercase">
            {brand.variant}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">{brand.name}</h1>
          <p className="text-sm text-text-secondary mt-2 font-medium">Last updated: {format(new Date(brand.lastUpdated), 'dd MMM yyyy, hh:mm a')}</p>
          
          <div className="flex flex-wrap gap-3 mt-6">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/brand/${id}/edit`)} 
              className="px-5 py-2.5 bg-bg-secondary hover:bg-border/50 text-text-primary rounded-xl font-bold flex items-center transition-colors text-sm"
            >
              <Edit size={16} className="mr-2" /> Edit Brand
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDelete} 
              className="px-5 py-2.5 bg-error/10 hover:bg-error/20 text-error rounded-xl font-bold flex items-center transition-colors text-sm"
            >
              <Trash2 size={16} className="mr-2" /> Delete Brand
            </motion.button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column (Stock Management) */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Current Stock Card */}
          <div className="premium-card p-6 md:p-8 flex flex-col relative overflow-hidden group border-2 border-primary/20">
            <div className="absolute -top-10 -right-10 opacity-[0.03]">
               <PackageOpen size={160} />
            </div>
            
            <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-1 relative z-10">Available Stock</p>
            <p className="text-5xl font-black text-text-primary mb-6 relative z-10">
              {brand.currentStock} <span className="text-lg text-text-secondary font-medium block mt-1">Bags</span>
            </p>
            
            <div className="w-full h-px bg-border my-2"></div>
            
            <form onSubmit={handleStockIn} className="mt-4 relative z-10">
              <p className="text-xs font-bold text-text-secondary mb-3 uppercase tracking-wider">Quick Add Stock</p>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="1"
                  className="flex-1 bg-bg-secondary border border-border rounded-xl px-4 text-sm font-bold text-text-primary focus:outline-none focus:border-primary/50" 
                  placeholder="Qty (e.g. 50)" 
                  value={stockInAmount}
                  onChange={(e) => setStockInAmount(e.target.value)}
                  required
                />
                <button type="submit" className="bg-primary hover:bg-primary-dark text-white rounded-xl p-3 shadow-md transition-colors active:scale-95">
                  <PlusCircle size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (Transactions) */}
        <div className="md:col-span-2">
          
          {/* Transaction History */}
          <div className="premium-card p-6 md:p-8 h-full">
            <h3 className="text-lg font-bold mb-6 flex items-center text-text-primary border-b border-border pb-4">
              <History size={20} className="mr-2 text-primary" /> Transaction History
            </h3>
            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx._id} className="flex justify-between items-center p-4 rounded-[14px] border border-border bg-bg-secondary/30 hover:bg-bg-secondary transition-colors group">
                  <div className="flex items-center">
                    <div className={`h-12 w-12 rounded-[12px] flex items-center justify-center mr-4 shadow-sm ${tx.type === 'IN' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                      {tx.type === 'IN' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-text-primary">
                        {tx.type === 'IN' ? 'Stock Added' : 'Billed Out'}
                        <span className={`ml-2 text-xs font-black ${tx.type === 'IN' ? 'text-success' : 'text-primary'}`}>
                          {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                        </span>
                      </p>
                      <p className="text-xs text-text-secondary mt-1 font-medium">{format(new Date(tx.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary uppercase tracking-widest font-bold">Balance</p>
                    <p className="font-black text-lg text-text-primary">{tx.currentStock}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center text-text-secondary py-12 font-medium border-2 border-dashed border-border rounded-xl">
                  No transactions yet for this brand.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
};

export default BrandDetails;
