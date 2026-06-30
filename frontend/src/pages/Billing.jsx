import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { Plus, Save, Trash2, CheckCircle2, Package, Search, Clock, Lock, Edit2, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorDialog from '../components/ErrorDialog';

/* ─── Per-row Brand Picker ─── */
const BrandPicker = ({ brands, value, onChange, disabled }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedBrand = brands.find(b => b._id === value) || null;

  const filtered = query.trim()
    ? brands.filter(b =>
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.variant.toLowerCase().includes(query.toLowerCase())
      )
    : brands;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (brand) => {
    onChange(brand._id);
    setQuery('');
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  if (disabled) {
    return (
      <div className="w-full p-2 rounded-lg bg-bg-secondary/50 opacity-50 text-sm text-text-secondary font-medium">
        {selectedBrand ? `${selectedBrand.name} – ${selectedBrand.variant}` : 'Select a brand...'}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger / Selected chip */}
      {selectedBrand ? (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/8 border border-primary/20 group/chip">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-text-primary truncate">{selectedBrand.name}</p>
            <p className="text-xs text-text-secondary truncate">{selectedBrand.variant} &bull; <span className={`font-semibold ${selectedBrand.currentStock <= 0 ? 'text-error' : 'text-success'}`}>{selectedBrand.currentStock} in stock</span></p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors shrink-0"
            title="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setOpen(true); setTimeout(() => ref.current?.querySelector('input')?.focus(), 50); }}
          className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
        >
          <Search size={15} className="text-text-secondary shrink-0" />
          <span className="text-sm text-text-secondary font-medium">Search & select a brand...</span>
          <ChevronDown size={14} className="ml-auto text-text-secondary/50 shrink-0" />
        </button>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '280px', minWidth: '260px' }}
          >
            {/* Search input */}
            <div className="p-2 border-b border-border sticky top-0 bg-white z-10">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type to search brands..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-medium text-text-primary bg-bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Results list */}
            <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-secondary font-medium">No brands match "{query}"</div>
              ) : (
                filtered.map(b => (
                  <button
                    key={b._id}
                    type="button"
                    onMouseDown={() => handleSelect(b)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 text-left transition-colors border-b border-border/40 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border bg-bg-secondary">
                      <img
                        src={b.image}
                        alt={b.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = 'https://placehold.co/40x40?text=?'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-text-primary truncate">{b.name}</p>
                      <p className="text-xs text-text-secondary truncate">{b.variant}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      b.currentStock <= 0
                        ? 'bg-error/10 text-error'
                        : b.currentStock <= b.minStockAlert
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success'
                    }`}>
                      {b.currentStock} bags
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Main Billing Page ─── */
const Billing = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [billData, setBillData] = useState({ billNumber: '', millName: '', partyName: '' });
  const [items, setItems] = useState([{ brand: '', quantity: '', id: Date.now() }]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  
  // Bill History
  const [bills, setBills] = useState([]);
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [loadingBills, setLoadingBills] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  const [deleteTargetBill, setDeleteTargetBill] = useState(null);
  
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const hasLockRef = useRef(false);

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (socket && user) {
      socket.emit('lock_billing', { adminName: user.name });
      const handleBillingLocked = (data) => {
        if (data.adminName !== user.name) setLockedBy(data.adminName);
        else hasLockRef.current = true;
      };
      const handleBillingUnlocked = () => {
        setLockedBy(null);
        socket.emit('lock_billing', { adminName: user.name });
      };
      socket.on('billing_locked', handleBillingLocked);
      socket.on('billing_unlocked', handleBillingUnlocked);
      return () => {
        socket.off('billing_locked', handleBillingLocked);
        socket.off('billing_unlocked', handleBillingUnlocked);
        if (hasLockRef.current) socket.emit('unlock_billing');
      };
    }
  }, [socket, user]);

  useEffect(() => {
    if (billSearchQuery.trim() !== '') {
      const timer = setTimeout(() => fetchBills(), 500);
      return () => clearTimeout(timer);
    } else {
      setBills([]);
    }
  }, [billSearchQuery]);

  const fetchBrands = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/brands`, config);
      setBrands(res.data);
    } catch (error) { console.error('Error fetching brands:', error); }
  };

  const fetchBills = async () => {
    setLoadingBills(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/bills?search=${billSearchQuery}`, config);
      setBills(res.data);
    } catch (error) { console.error('Error fetching bills:', error); }
    finally { setLoadingBills(false); }
  };

  const handleDeleteBill = async () => {
    if (!deleteTargetBill) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL}/bills/${deleteTargetBill._id}`, config);
      toast.success(`Bill ${deleteTargetBill.billNumber} cancelled and stock restored`);
      setDeleteTargetBill(null);
      fetchBills();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete bill');
      setDeleteTargetBill(null);
    }
  };

  const handleChange = (e) => setBillData({ ...billData, [e.target.name]: e.target.value });

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { brand: '', quantity: '', id: Date.now() }]);

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (lockedBy) return;
    // Validate all items have a brand selected
    for (const item of items) {
      if (!item.brand) { toast.error('Please select a brand for every row.'); return; }
    }
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsConfirmDialogOpen(false);
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = {
        ...billData,
        items: items.map(item => ({ brand: item.brand, quantity: Number(item.quantity) }))
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/bills`, payload, config);
      setSuccess(true);
      if (socket) socket.emit('unlock_billing');
      setBillData({ billNumber: '', millName: '', partyName: '' });
      setItems([{ brand: '', quantity: '', id: Date.now() }]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      setErrorDialog({
        open: true,
        title: 'Bill Creation Failed',
        message: error.response?.data?.error || 'Failed to create bill. Please try again.'
      });
    }
    setLoading(false);
  };

  return (
    <PageTransition className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-24 md:pb-8">
      
      {/* Header and Bill Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Billing</h1>
          <p className="text-sm text-text-secondary mt-1">{format(new Date(), 'EEEE, dd MMM yyyy, hh:mm a')}</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search past bills by number or date..."
            value={billSearchQuery}
            onChange={(e) => setBillSearchQuery(e.target.value)}
            className="w-full bg-white border border-border rounded-full py-3.5 pl-12 pr-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-primary/50 outline-none text-text-primary transition-all text-sm font-medium"
          />
        </div>
      </div>

      {/* Bill Search Results */}
      <AnimatePresence>
        {billSearchQuery.trim() !== '' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">Search Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingBills ? (
                <div className="col-span-full p-8 text-center text-text-secondary">Searching bills...</div>
              ) : bills.length === 0 ? (
                <div className="col-span-full p-8 text-center text-text-secondary">No bills match your search.</div>
              ) : (
                bills.map(bill => (
                  <motion.div
                    key={bill._id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="premium-card p-5 group flex flex-col justify-between"
                  >
                    <div onClick={() => navigate(`/bills/${bill._id}`)} className="cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <span className="font-black text-text-primary text-lg tracking-tight">{bill.billNumber}</span>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{bill.totalQuantity} Bags</span>
                      </div>
                      <p className="text-sm font-medium text-text-primary">{bill.partyName}</p>
                      <p className="text-sm text-text-secondary mb-4">{bill.millName}</p>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-xs font-medium text-text-secondary mb-3">
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{format(new Date(bill.createdAt), 'MMM dd, yyyy - hh:mm a')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/bills/${bill._id}`)} className="flex-1 text-center text-xs font-bold text-primary hover:underline py-1">
                          View Details →
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/bills/${bill._id}/edit`); }}
                          className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                          title="Edit Bill"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTargetBill(bill); }}
                          className="p-2 bg-error/10 text-error rounded-xl hover:bg-error/20 transition-colors"
                          title="Delete Bill"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status banners */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-success-light border border-success/20 text-success p-4 rounded-[18px] flex items-center shadow-sm"
          >
            <CheckCircle2 className="mr-3 h-6 w-6 text-success" />
            <span className="font-bold">Bill created successfully!</span>
          </motion.div>
        )}
        {lockedBy && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="mb-6 p-4 bg-warning-light border border-warning/20 text-warning rounded-[18px] flex items-center shadow-sm"
          >
            <Lock className="mr-3 shrink-0" size={24} />
            <div>
              <p className="font-bold">Billing Currently Locked</p>
              <p className="text-sm">Another admin ({lockedBy}) is currently creating a bill. Please wait until they finish.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Bill Form */}
      <form onSubmit={handleSubmitRequest} className="space-y-6">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mt-8 mb-4">Create New Bill</h3>

        {/* Bill Info */}
        <div className="premium-card p-6 md:p-8 space-y-5">
          <div className="flex items-center space-x-3 mb-2 border-b border-border pb-4">
            <div className="bg-primary/10 p-2 rounded-xl text-primary"><Package size={20} /></div>
            <h3 className="font-bold text-text-primary text-lg">Bill Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="relative">
              <input type="text" id="billNumber" name="billNumber" required value={billData.billNumber} onChange={handleChange} disabled={!!lockedBy} className="floating-input font-mono" placeholder=" " />
              <label htmlFor="billNumber" className="floating-label">Bill Number (e.g. INV-123)</label>
            </div>
            <div className="relative">
              <input type="text" id="millName" name="millName" required value={billData.millName} onChange={handleChange} disabled={!!lockedBy} className="floating-input" placeholder=" " />
              <label htmlFor="millName" className="floating-label">Mill Name</label>
            </div>
            <div className="relative">
              <input type="text" id="partyName" name="partyName" required value={billData.partyName} onChange={handleChange} disabled={!!lockedBy} className="floating-input" placeholder=" " />
              <label htmlFor="partyName" className="floating-label">Party Name</label>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="premium-card p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-text-primary text-lg">Products</h3>
            <span className="text-xs font-medium text-text-secondary">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item, index) => {
                const selectedBrand = brands.find(b => b._id === item.brand);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col sm:flex-row gap-3 p-4 rounded-[14px] border border-border bg-bg-secondary/20 hover:bg-bg-secondary/40 transition-colors"
                  >
                    {/* Row number */}
                    <div className="hidden sm:flex items-start pt-1 shrink-0">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">{index + 1}</span>
                    </div>

                    {/* Brand picker */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Brand</p>
                      <BrandPicker
                        brands={brands}
                        value={item.brand}
                        onChange={(val) => handleItemChange(index, 'brand', val)}
                        disabled={!!lockedBy}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="w-full sm:w-32 shrink-0">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Qty (bags)</p>
                      <input
                        type="number"
                        required
                        min="1"
                        max={selectedBrand ? selectedBrand.currentStock : undefined}
                        disabled={!!lockedBy}
                        className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm font-bold text-center focus:ring-2 focus:ring-primary/30 focus:outline-none focus:border-primary disabled:opacity-50"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                      {selectedBrand && (
                        <p className={`text-xs text-center mt-1 font-medium ${selectedBrand.currentStock <= 0 ? 'text-error' : 'text-text-secondary'}`}>
                          max {selectedBrand.currentStock}
                        </p>
                      )}
                    </div>

                    {/* Remove */}
                    <div className="flex sm:flex-col items-end justify-end shrink-0">
                      <motion.button
                        whileHover={items.length > 1 ? { scale: 1.1 } : {}}
                        whileTap={items.length > 1 ? { scale: 0.9 } : {}}
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className={`p-2 rounded-lg transition-colors ${items.length === 1 ? 'text-border cursor-not-allowed' : 'text-text-secondary hover:text-error hover:bg-error/10'}`}
                        title="Remove row"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <motion.button
              whileHover={!lockedBy ? { scale: 1.01 } : {}}
              whileTap={!lockedBy ? { scale: 0.98 } : {}}
              type="button"
              onClick={addItem}
              disabled={!!lockedBy}
              className={`w-full py-3 text-primary text-sm font-bold flex items-center justify-center rounded-xl transition-colors ${lockedBy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/5'}`}
            >
              <Plus size={18} className="mr-2" /> Add Another Brand
            </motion.button>
          </div>
        </div>

        <motion.button
          whileHover={!loading && !lockedBy ? { scale: 1.01 } : {}}
          whileTap={!loading && !lockedBy ? { scale: 0.98 } : {}}
          type="submit"
          disabled={loading || !!lockedBy}
          className={`w-full btn-primary text-lg shadow-xl ${(loading || lockedBy) ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <Save className="mr-2" /> {loading ? 'Saving...' : 'Complete Bill'}
        </motion.button>
      </form>

      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="Confirm New Bill"
        message={`Are you sure you want to bill these items to ${billData.partyName || 'the selected party'}?`}
        confirmText="Confirm Bill"
        cancelText="Cancel"
        isDangerous={false}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setIsConfirmDialogOpen(false)}
      />
      <ConfirmDialog
        isOpen={!!deleteTargetBill}
        title="Delete Bill"
        message={`Are you sure you want to delete bill ${deleteTargetBill?.billNumber}? All stock will be restored.`}
        confirmText="Delete Bill"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDeleteBill}
        onCancel={() => setDeleteTargetBill(null)}
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

export default Billing;
