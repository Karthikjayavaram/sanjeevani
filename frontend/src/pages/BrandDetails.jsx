import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, History, PackageOpen, TrendingUp, TrendingDown, Lock, Building2, Box, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorDialog from '../components/ErrorDialog';
import TransactionDetailsDialog from '../components/TransactionDetailsDialog';

const BrandDetails = () => {
  const { id } = useParams();
  const [brand, setBrand] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stockInAmount, setStockInAmount] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  
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
      await axios.post(`${import.meta.env.VITE_API_URL}/brands/${id}/stock-in`, { quantity: Number(stockInAmount), companyName: companyName.trim() || undefined }, config);
      setStockInAmount('');
      setCompanyName('');
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

  const handleTransactionClick = (tx) => {
    setSelectedTransaction(tx);
    setIsTransactionDialogOpen(true);
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

  const stockStatus = brand.currentStock <= 0
    ? { color: 'text-error', bg: 'bg-error/10 border-error/20', label: 'Out of Stock' }
    : brand.currentStock <= brand.minStockAlert
      ? { color: 'text-warning', bg: 'bg-warning-light border-warning/20', label: 'Low Stock' }
      : { color: 'text-success', bg: 'bg-success/10 border-success/20', label: 'In Stock' };

  return (
    <PageTransition className="p-4 md:p-8 space-y-5 max-w-4xl mx-auto pb-24 md:pb-8">

      {/* ── 1. Brand Details Card ── */}
      <div className="premium-card p-6 md:p-8 relative">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-text-secondary hover:text-text-primary bg-bg-secondary rounded-full transition-colors"
          title="Go Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
          {/* Image */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[20px] overflow-hidden shadow-sm shrink-0 border border-border">
            <img
              src={brand.image}
              alt={brand.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = 'https://placehold.co/400x400/2563EB/FFFFFF?text=No+Image'; }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase">
                {brand.variant}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${stockStatus.bg} ${stockStatus.color}`}>
                {stockStatus.label}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight truncate">{brand.name}</h1>
            <p className="text-sm text-text-secondary mt-1.5 font-medium">
              Last updated: {format(new Date(brand.lastUpdated), 'dd MMM yyyy, hh:mm a')}
            </p>

            {lockedBy && (
              <div className="mt-3 bg-warning-light border border-warning/20 text-warning p-3 rounded-xl flex items-center text-sm">
                <Lock className="mr-2 shrink-0" size={15} />
                <span><strong>{lockedBy}</strong> is currently editing this brand.</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <motion.button
                whileHover={!lockedBy ? { scale: 1.02 } : {}}
                whileTap={!lockedBy ? { scale: 0.98 } : {}}
                onClick={() => !lockedBy && navigate(`/brand/${id}/edit`)}
                disabled={!!lockedBy}
                className={`px-4 py-2 rounded-xl font-bold flex items-center transition-colors text-sm ${lockedBy ? 'bg-bg-secondary text-text-secondary opacity-50 cursor-not-allowed' : 'bg-bg-secondary hover:bg-border/50 text-text-primary'}`}
              >
                <Edit size={15} className="mr-1.5" /> Edit Brand
              </motion.button>
              <motion.button
                whileHover={!lockedBy ? { scale: 1.02 } : {}}
                whileTap={!lockedBy ? { scale: 0.98 } : {}}
                onClick={() => !lockedBy && setIsDeleteDialogOpen(true)}
                disabled={!!lockedBy}
                className={`px-4 py-2 rounded-xl font-bold flex items-center transition-colors text-sm ${lockedBy ? 'bg-error/5 text-error/50 opacity-50 cursor-not-allowed' : 'bg-error/10 hover:bg-error/20 text-error'}`}
              >
                <Trash2 size={15} className="mr-1.5" /> Delete Brand
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Available Stock + Quick Add Stock (side-by-side on md+) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Available Stock */}
        <div className="premium-card p-6 md:p-8 flex flex-col relative overflow-hidden border-2 border-primary/20">
          <div className="absolute -top-8 -right-8 opacity-[0.04]">
            <PackageOpen size={140} />
          </div>
          <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-1 relative z-10">Available Stock</p>
          <p className="text-6xl font-black text-text-primary relative z-10">
            {brand.currentStock}
            <span className="text-base text-text-secondary font-medium ml-2">Bags</span>
          </p>
          <div className="w-full h-px bg-border my-4"></div>
          <div className="flex gap-4 text-sm relative z-10">
            <div>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-0.5">Min Alert</p>
              <p className="font-black text-text-primary">{brand.minStockAlert} bags</p>
            </div>
            <div className="w-px bg-border"></div>
            <div>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-0.5">Status</p>
              <p className={`font-black ${stockStatus.color}`}>{stockStatus.label}</p>
            </div>
          </div>
        </div>

        {/* Quick Add Stock */}
        <div className="premium-card p-6 md:p-8 flex flex-col">
          <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-4">Quick Add Stock</p>
          <form onSubmit={handleStockInRequest} className="flex flex-col gap-3 flex-1">
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-3 py-3 text-sm font-medium text-text-primary focus:outline-none focus:border-primary/50 disabled:opacity-50"
                placeholder="Company Name (optional)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!!lockedBy}
              />
            </div>
            <input
              type="number"
              min="1"
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-bold text-text-primary focus:outline-none focus:border-primary/50 disabled:opacity-50"
              placeholder="Quantity (e.g. 50 bags)"
              value={stockInAmount}
              onChange={(e) => setStockInAmount(e.target.value)}
              disabled={!!lockedBy}
              required
            />
            <button
              type="submit"
              disabled={!!lockedBy}
              className={`w-full py-3 rounded-xl font-bold text-sm text-white bg-primary shadow-md transition-all active:scale-95 mt-auto ${lockedBy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark hover:shadow-lg'}`}
            >
              Add Stock
            </button>
          </form>
        </div>

      </div>

      {/* ── 3. Transaction History ── */}
      <div className="premium-card p-6 md:p-8">
        <h3 className="text-lg font-bold mb-6 flex items-center text-text-primary border-b border-border pb-4">
          <History size={20} className="mr-2 text-primary" /> Transaction History
          <span className="ml-auto text-sm font-medium text-text-secondary">{transactions.length} record{transactions.length !== 1 ? 's' : ''}</span>
        </h3>

        <div className="space-y-3">
          {transactions.map(tx => (
            <motion.div
              key={tx._id}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleTransactionClick(tx)}
              className="flex justify-between items-center p-4 rounded-[14px] border border-border bg-bg-secondary/30 hover:bg-bg-secondary transition-colors group cursor-pointer"
            >
              <div className="flex items-center">
                <div className={`h-11 w-11 rounded-[12px] flex items-center justify-center mr-3 shadow-sm shrink-0 ${tx.type === 'IN' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                  {tx.type === 'IN' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
                <div>
                  <p className="font-bold text-sm text-text-primary">
                    {tx.type === 'IN' ? 'Stock Added' : 'Billed Out'}
                    <span className={`ml-2 text-xs font-black ${tx.type === 'IN' ? 'text-success' : 'text-primary'}`}>
                      {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                    </span>
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5 font-medium">{format(new Date(tx.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
                  {tx.type === 'IN' && tx.companyName && (
                    <p className="text-xs text-success/70 font-semibold mt-0.5 flex items-center gap-1">
                      <Building2 size={10} /> {tx.companyName}
                    </p>
                  )}
                  {tx.type === 'OUT' && tx.referenceId && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {tx.referenceId.partyName && (
                        <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
                          {tx.referenceId.partyName}
                        </span>
                      )}
                      {tx.referenceId.millName && (
                        <span className="text-xs bg-bg-secondary text-text-secondary font-medium px-2 py-0.5 rounded-md border border-border">
                          {tx.referenceId.millName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-xs text-text-secondary uppercase tracking-widest font-bold">Balance</p>
                <p className="font-black text-lg text-text-primary">{tx.currentStock}</p>
                <p className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold mt-0.5">View →</p>
              </div>
            </motion.div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center text-text-secondary py-14 font-medium border-2 border-dashed border-border rounded-xl">
              No transactions yet for this brand.
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
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
        message={`Are you sure you want to add ${stockInAmount} bags to ${brand.name} - ${brand.variant}${companyName ? ` from ${companyName}` : ''}?`}
        confirmText="Add Stock"
        cancelText="Cancel"
        isDangerous={false}
        onConfirm={handleStockInConfirm}
        onCancel={() => setIsAddStockDialogOpen(false)}
      />
      <TransactionDetailsDialog
        isOpen={isTransactionDialogOpen}
        transaction={selectedTransaction}
        onClose={() => { setIsTransactionDialogOpen(false); setSelectedTransaction(null); }}
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
