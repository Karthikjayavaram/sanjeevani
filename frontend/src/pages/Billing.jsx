import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { Plus, Save, Trash2, CheckCircle2, Package, Search, Clock, FileText, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorDialog from '../components/ErrorDialog';

const Billing = () => {
  const navigate = useNavigate();
  // New Bill State
  const [brands, setBrands] = useState([]);
  const [billData, setBillData] = useState({
    billNumber: '',
    millName: '',
    partyName: ''
  });
  const [items, setItems] = useState([{ brand: '', quantity: '', id: Date.now() }]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  
  // Bill History State
  const [bills, setBills] = useState([]);
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [loadingBills, setLoadingBills] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const hasLockRef = useRef(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (socket && user) {
      socket.emit('lock_billing', { adminName: user.name });

      const handleBillingLocked = (data) => {
        if (data.adminName !== user.name) {
          setLockedBy(data.adminName);
        } else {
          hasLockRef.current = true;
        }
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
        if (hasLockRef.current) {
          socket.emit('unlock_billing');
        }
      };
    }
  }, [socket, user]);

  useEffect(() => {
    if (billSearchQuery.trim() !== '') {
      const timer = setTimeout(() => {
        fetchBills();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setBills([]);
    }
  }, [billSearchQuery]);

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(brandSearch.toLowerCase()) || 
    b.variant.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const fetchBrands = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/brands`, config);
      setBrands(res.data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchBills = async () => {
    setLoadingBills(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/bills?search=${billSearchQuery}`, config);
      setBills(res.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoadingBills(false);
    }
  };

  const handleChange = (e) => {
    setBillData({ ...billData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { brand: '', quantity: '', id: Date.now() }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (lockedBy) return;
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
      
      {/* Header and Global Search */}
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

      <AnimatePresence>
        {/* Render Search Results dynamically if query is typed */}
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
                    onClick={() => navigate(`/bills/${bill._id}`)}
                    className="premium-card p-5 group flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <span className="font-black text-text-primary text-lg tracking-tight">{bill.billNumber}</span>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{bill.totalQuantity} Bags</span>
                      </div>
                      <p className="text-sm font-medium text-text-primary">{bill.partyName}</p>
                      <p className="text-sm text-text-secondary mb-4">{bill.millName}</p>
                    </div>
                    <div className="pt-4 border-t border-border flex items-center justify-between text-xs font-medium text-text-secondary">
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{format(new Date(bill.createdAt), 'MMM dd, yyyy - hh:mm a')}</span>
                      </div>
                      <span className="text-primary font-bold group-hover:underline">View Details →</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Package size={20} />
            </div>
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

        {/* Products Data Grid */}
        <div className="premium-card p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <h3 className="font-bold text-text-primary text-lg">Products</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search brands..." 
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="bg-bg-secondary border border-border rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary w-full sm:w-64"
              />
            </div>
          </div>
          
          <div className="border border-border rounded-[14px] overflow-hidden">
            <div className="grid grid-cols-12 gap-4 bg-bg-secondary p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border">
              <div className="col-span-8 md:col-span-8 pl-2">Brand Selection</div>
              <div className="col-span-4 md:col-span-3">Quantity (Bags)</div>
              <div className="hidden md:block md:col-span-1 text-center">Action</div>
            </div>
            
            <div className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {items.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, height: 0, backgroundColor: '#EFF6FF' }}
                    animate={{ opacity: 1, height: 'auto', backgroundColor: '#FFFFFF' }}
                    exit={{ opacity: 0, height: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-12 gap-4 p-4 items-center group hover:bg-bg-secondary/50 transition-colors relative"
                  >
                    <div className="col-span-8 md:col-span-8">
                      <select 
                        required 
                        disabled={!!lockedBy}
                        className="w-full bg-transparent border-0 text-text-primary text-sm md:text-base font-medium focus:ring-0 focus:outline-none cursor-pointer p-2 rounded-lg hover:bg-border/30 transition-colors disabled:opacity-50"
                        value={item.brand}
                        onChange={(e) => handleItemChange(index, 'brand', e.target.value)}
                      >
                        <option value="" disabled className="text-text-secondary">Select a brand...</option>
                        {filteredBrands.map(b => (
                          <option key={b._id} value={b._id} className="text-text-primary">
                            {b.name} - {b.variant} • {b.currentStock} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-span-4 md:col-span-3">
                      <input 
                        type="number" 
                        required 
                        min="1"
                        disabled={!!lockedBy}
                        className="w-full bg-transparent border-b border-border/50 text-text-primary text-center text-sm md:text-base font-medium focus:ring-0 focus:outline-none focus:border-primary p-2 transition-colors placeholder:text-text-secondary/50 disabled:opacity-50" 
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                    </div>

                    <div className="hidden md:flex md:col-span-1 justify-center">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button" 
                        onClick={() => removeItem(index)} 
                        disabled={items.length === 1}
                        className={`p-2 rounded-lg transition-colors ${items.length === 1 ? 'text-border cursor-not-allowed' : 'text-text-secondary hover:text-error hover:bg-error/10'}`}
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>

                    <div className="md:hidden absolute -top-1 -right-1">
                      <button 
                        type="button" 
                        onClick={() => removeItem(index)} 
                        disabled={items.length === 1}
                        className={`p-2 transition-colors ${items.length === 1 ? 'hidden' : 'text-text-secondary hover:text-error'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <div className="p-2 border-t border-border bg-bg-secondary/30">
              <motion.button 
                whileHover={!lockedBy ? { scale: 1.01 } : {}}
                whileTap={!lockedBy ? { scale: 0.98 } : {}}
                type="button" 
                onClick={addItem} 
                disabled={!!lockedBy}
                className={`w-full py-3 text-primary text-sm font-bold flex items-center justify-center rounded-xl transition-colors ${lockedBy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/5'}`}
              >
                <Plus size={18} className="mr-2" /> Add Item
              </motion.button>
            </div>
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

