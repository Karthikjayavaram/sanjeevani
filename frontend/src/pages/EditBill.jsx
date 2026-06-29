import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Plus, Save, Trash2, ArrowLeft, Package } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const EditBill = () => {
  const { id } = useParams();
  const [brands, setBrands] = useState([]);
  const [billData, setBillData] = useState({
    billNumber: '',
    millName: '',
    partyName: ''
  });
  const [items, setItems] = useState([{ brand: '', quantity: '', id: Date.now() }]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBrandsAndBill();
  }, [id]);

  const fetchBrandsAndBill = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const [brandsRes, billRes] = await Promise.all([
        axios.get(`http://localhost:5001/api/brands`, config),
        axios.get(`http://localhost:5001/api/bills/${id}`, config)
      ]);
      setBrands(brandsRes.data);
      
      const bill = billRes.data;
      setBillData({
        billNumber: bill.billNumber,
        millName: bill.millName,
        partyName: bill.partyName
      });
      setItems(bill.items.map(i => ({ brand: i.brand._id || i.brand, quantity: i.quantity, id: Math.random() })));
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setFetching(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      const payload = {
        ...billData,
        items: items.map(item => ({ brand: item.brand, quantity: Number(item.quantity) }))
      };

      await axios.put(`http://localhost:5001/api/bills/${id}`, payload, config);
      toast.success('Bill updated successfully!');
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to update bill');
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <PageTransition className="p-4 space-y-4 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-bg-secondary rounded w-1/3 mb-8"></div>
        <div className="h-48 bg-bg-primary rounded-[18px] border border-border"></div>
        <div className="h-64 bg-bg-primary rounded-[18px] border border-border mt-8"></div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center mt-2 mb-6">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)} 
          className="mr-4 p-2.5 bg-bg-primary text-text-secondary hover:text-text-primary rounded-full shadow-sm hover:shadow-md transition-all border border-border"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Edit Bill</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-warning-light border border-warning/20 text-warning p-4 rounded-[18px] text-sm font-medium shadow-sm flex items-start">
        <strong className="mr-2">Note:</strong> Modifying the bill will automatically recalculate and adjust the stock for all included brands.
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <input type="text" id="billNumber" name="billNumber" readOnly value={billData.billNumber} className="floating-input font-mono bg-bg-secondary cursor-not-allowed" placeholder=" " />
              <label htmlFor="billNumber" className="floating-label">Bill Number (Read Only)</label>
            </div>
            <div className="relative">
              <input type="text" id="millName" name="millName" required value={billData.millName} onChange={handleChange} className="floating-input" placeholder=" " />
              <label htmlFor="millName" className="floating-label">Mill Name</label>
            </div>
            <div className="relative">
              <input type="text" id="partyName" name="partyName" required value={billData.partyName} onChange={handleChange} className="floating-input" placeholder=" " />
              <label htmlFor="partyName" className="floating-label">Party Name</label>
            </div>
          </div>
        </div>

        {/* Products Data Grid */}
        <div className="premium-card p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-text-primary text-lg">Products</h3>
          </div>
          
          <div className="border border-border rounded-[14px] overflow-hidden">
            {/* Grid Header */}
            <div className="grid grid-cols-12 gap-4 bg-bg-secondary p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border">
              <div className="col-span-8 md:col-span-8 pl-2">Brand Selection</div>
              <div className="col-span-4 md:col-span-3">Quantity (Bags)</div>
              <div className="hidden md:block md:col-span-1 text-center">Action</div>
            </div>
            
            {/* Grid Body */}
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
                        className="w-full bg-transparent border-0 text-text-primary text-sm md:text-base font-medium focus:ring-0 focus:outline-none cursor-pointer p-2 rounded-lg hover:bg-border/30 transition-colors"
                        value={item.brand}
                        onChange={(e) => handleItemChange(index, 'brand', e.target.value)}
                      >
                        <option value="" disabled className="text-text-secondary">Select a brand...</option>
                        {brands.map(b => (
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
                        className="w-full bg-transparent border-b border-border/50 text-text-primary text-center text-sm md:text-base font-medium focus:ring-0 focus:outline-none focus:border-primary p-2 transition-colors placeholder:text-text-secondary/50" 
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
                        title="Remove product"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>

                    {/* Mobile Remove Button (Absolute) */}
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
            
            {/* Add Row Button */}
            <div className="p-2 border-t border-border bg-bg-secondary/30">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="button" 
                onClick={addItem} 
                className="w-full py-3 text-primary text-sm font-bold flex items-center justify-center rounded-xl hover:bg-primary/5 transition-colors"
              >
                <Plus size={18} className="mr-2" /> Add Item
              </motion.button>
            </div>
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit" 
          disabled={loading} 
          className={`w-full btn-primary text-lg shadow-xl ${loading ? 'opacity-70' : ''}`}
        >
          <Save className="mr-2" /> {loading ? 'Saving...' : 'Update Bill'}
        </motion.button>
      </form>
    </PageTransition>
  );
};

export default EditBill;
