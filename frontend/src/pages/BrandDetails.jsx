import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, PlusCircle, History, PackageOpen, TrendingUp, TrendingDown, Save, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorDialog from '../components/ErrorDialog';

const BrandDetails = () => {
  const { id } = useParams();
  const [brand, setBrand] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stockInAmount, setStockInAmount] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const hasLockRef = useRef(false);

  useEffect(() => {
    fetchBrandDetails();
    fetchTransactions();
  }, [id]);

  useEffect(() => {
    if (socket && user && id) {
      socket.emit('lock_brand', { brandId: id, adminName: user.name });

      const handleBrandLocked = (data) => {
        if (data.brandId === id) {
          if (data.adminName !== user.name) {
            setLockedBy(data.adminName);
          } else {
            hasLockRef.current = true;
          }
        }
      };

      const handleBrandUnlocked = (data) => {
        if (data.brandId === id) {
          setLockedBy(null);
          socket.emit('lock_brand', { brandId: id, adminName: user.name });
        }
      };

      socket.on('brand_locked', handleBrandLocked);
      socket.on('brand_unlocked', handleBrandUnlocked);

      return () => {
        socket.off('brand_locked', handleBrandLocked);
        socket.off('brand_unlocked', handleBrandUnlocked);
        if (hasLockRef.current) {
          socket.emit('unlock_brand', { brandId: id });
        }
      };
    }
  }, [id, socket, user]);

  const fetchBrandDetails = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/brands/${id}`, config);
      setBrand(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/brands/${id}/transactions`, config);
      setTransactions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStockInRequest = (e) => {
    e.preventDefault();
    if (lockedBy) return;
    if (!stockInAmount || stockInAmount <= 0) return;
    setIsAddStockDialogOpen(true);
  };

  const handleStockInConfirm = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/brands/${id}/stock-in`, { quantity: Number(stockInAmount) }, config);
      setStockInAmount('');
      setIsAddStockDialogOpen(false);
      fetchBrandDetails();
      fetchTransactions();
    } catch (error) {
      console.error(error);
      setErrorDialog({
        open: true,
        title: 'Stock In Failed',
        message: error.response?.data?.error || 'Failed to add stock. Please try again.'
      });
      setIsAddStockDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL}/brands/${id}`, config);
      navigate('/');
    } catch (error) {
      console.error(error);
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
              whileHover={!lockedBy ? { scale: 1.02 } : {}}
              whileTap={!lockedBy ? { scale: 0.98 } : {}}
              onClick={() => !lockedBy && navigate(`/brand/${id}/edit`)} 
              disabled={!!lockedBy}
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center transition-colors text-sm ${lockedBy ? 'bg-bg-secondary text-text-secondary opacity-50 cursor-not-allowed' : 'bg-bg-secondary hover:bg-border/50 text-text-primary'}`}
            >
              <Edit size={16} className="mr-2" /> Edit Brand
            </motion.button>
            <motion.button 
              whileHover={!lockedBy ? { scale: 1.02 } : {}}
              whileTap={!lockedBy ? { scale: 0.98 } : {}}
              onClick={() => !lockedBy && setIsDeleteDialogOpen(true)} 
              disabled={!!lockedBy}
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center transition-colors text-sm ${lockedBy ? 'bg-error/5 text-error/50 opacity-50 cursor-not-allowed' : 'bg-error/10 hover:bg-error/20 text-error'}`}
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
            
            {lockedBy && (
              <div className="mt-4 bg-warning-light border border-warning/20 text-warning p-3 rounded-xl flex items-start text-sm relative z-10">
                <Lock className="mr-2 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold">Locked for Editing</p>
                  <p>{lockedBy} is currently editing this brand.</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleStockInRequest} className="mt-4 relative z-10">
              <p className="text-xs font-bold text-text-secondary mb-3 uppercase tracking-wider">Quick Add Stock</p>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="1"
                  className="flex-1 bg-bg-secondary border border-border rounded-xl px-4 text-sm font-bold text-text-primary focus:outline-none focus:border-primary/50 disabled:opacity-50" 
                  placeholder="Qty (e.g. 50)" 
                  value={stockInAmount}
                  onChange={(e) => setStockInAmount(e.target.value)}
                  disabled={!!lockedBy}
                  required
                />
                <button type="submit" disabled={!!lockedBy} className={`bg-primary hover:bg-primary-dark text-white rounded-xl p-3 shadow-md transition-colors active:scale-95 ${lockedBy ? 'opacity-50 cursor-not-allowed' : ''}`}>
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

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Brand"
        message={`Are you sure you want to delete ${brand.name}? This action cannot be undone.`}
        confirmText="Delete Brand"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={isAddStockDialogOpen}
        title="Confirm Stock Addition"
        message={`Are you sure you want to add ${stockInAmount} bags to ${brand.name} - ${brand.variant}?`}
        confirmText="Add Stock"
        cancelText="Cancel"
        isDangerous={false}
        onConfirm={handleStockInConfirm}
        onCancel={() => setIsAddStockDialogOpen(false)}
      />
      <ErrorDialog
        isOpen={errorDialog.open}
        title={errorDialog.title}
        message={errorDialog.message}
        onClose={() => setErrorDialog({ open: false, title: '', message: '' })}
      />
    </PageTransition>
  );
};

export default BrandDetails;

