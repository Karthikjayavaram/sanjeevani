import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Edit2, Trash2, Package, Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';

const BillDetails = () => {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => { fetchBill(); }, [id]);

  const fetchBill = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/bills/${id}`, config);
      setBill(res.data);
    } catch (error) {
      toast.error('Failed to load bill');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL}/bills/${id}`, config);
      toast.success('Bill cancelled and stock restored');
      navigate(-1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel bill');
    }
  };

  if (loading) return (
    <PageTransition className="p-4 md:p-8 max-w-4xl mx-auto animate-pulse">
      <div className="h-10 bg-bg-secondary rounded w-1/3 mb-8"></div>
      <div className="h-96 bg-bg-secondary rounded-[24px]"></div>
    </PageTransition>
  );

  if (!bill) return (
    <PageTransition className="p-8 text-center text-text-secondary">
      <FileText size={48} className="mx-auto mb-4 opacity-40" />
      <p className="font-bold text-lg">Bill not found</p>
    </PageTransition>
  );

  return (
    <PageTransition className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-8">
        <div className="flex items-center">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)}
            className="mr-4 p-2.5 bg-bg-primary text-text-secondary hover:text-text-primary rounded-full shadow-sm hover:shadow-md transition-all border border-border">
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Bill Details</h1>
            <p className="text-sm text-text-secondary mt-0.5">{bill.billNumber}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/bills/${id}/edit`)}
            className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors" title="Edit Bill">
            <Edit2 size={18} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => window.print()}
            className="p-2.5 bg-bg-secondary text-text-secondary rounded-xl hover:bg-border/50 transition-colors" title="Print">
            <Printer size={18} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setIsCancelDialogOpen(true)}
            className="p-2.5 bg-error/10 text-error rounded-xl hover:bg-error/20 transition-colors" title="Cancel Bill">
            <Trash2 size={18} />
          </motion.button>
        </div>
      </div>

      {/* Invoice Card */}
      <div className="premium-card p-6 md:p-10">
        {/* Invoice Header */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-border pb-8 mb-8">
          <div>
            <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold inline-block mb-3 tracking-widest uppercase">Tax Invoice</div>
            <h2 className="text-3xl font-black text-text-primary tracking-tight">{bill.millName}</h2>
            <p className="text-text-secondary mt-1 font-medium">Rice GoDown — Bill of Supply</p>
          </div>
          <div className="text-left md:text-right mt-4 md:mt-0">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Bill Number</p>
            <p className="text-2xl font-black text-text-primary font-mono">{bill.billNumber}</p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
          <div>
            <div className="flex items-center text-text-secondary text-xs font-bold uppercase tracking-wider mb-2"><User size={14} className="mr-1.5" /> Billed To</div>
            <p className="font-black text-text-primary text-lg">{bill.partyName}</p>
          </div>
          <div>
            <div className="flex items-center text-text-secondary text-xs font-bold uppercase tracking-wider mb-2"><Calendar size={14} className="mr-1.5" /> Date & Time</div>
            <p className="font-bold text-text-primary">{format(new Date(bill.createdAt), 'dd MMM yyyy')}</p>
            <p className="text-sm text-text-secondary font-medium">{format(new Date(bill.createdAt), 'hh:mm a')}</p>
          </div>
          <div>
            <div className="flex items-center text-text-secondary text-xs font-bold uppercase tracking-wider mb-2"><Package size={14} className="mr-1.5" /> Total Bags</div>
            <p className="font-black text-primary text-2xl">{bill.totalQuantity}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-[16px] border border-border mb-8">
          <div className="grid grid-cols-12 gap-4 bg-bg-secondary p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border">
            <div className="col-span-1">#</div>
            <div className="col-span-7">Item Description</div>
            <div className="col-span-2 text-center">Variant</div>
            <div className="col-span-2 text-right">Qty</div>
          </div>
          <div className="divide-y divide-border">
            {bill.items.map((item, index) => (
              <div key={item._id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-bg-secondary/50 transition-colors">
                <div className="col-span-1 text-text-secondary font-bold text-sm">{index + 1}</div>
                <div className="col-span-7"><p className="font-bold text-text-primary">{item.brand?.name || 'Deleted Brand'}</p></div>
                <div className="col-span-2 text-center"><span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{item.brand?.variant || 'N/A'}</span></div>
                <div className="col-span-2 text-right"><span className="font-black text-text-primary">{item.quantity}</span><span className="text-text-secondary text-xs ml-1">bags</span></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-4 p-5 items-center bg-primary/5 border-t-2 border-primary/20">
            <div className="col-span-10 text-right font-black text-text-primary uppercase tracking-wider text-sm">Total Quantity</div>
            <div className="col-span-2 text-right"><span className="font-black text-2xl text-primary">{bill.totalQuantity}</span><span className="text-text-secondary text-xs ml-1">bags</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-border text-xs text-text-secondary font-medium">
          <p>Generated by <span className="font-bold text-text-primary">{bill.adminId?.name || 'Administrator'}</span></p>
          <p className="italic">Thank you for your business!</p>
        </div>
      </div>

      <ConfirmDialog isOpen={isCancelDialogOpen} title="Cancel Bill"
        message={`Are you sure you want to cancel bill ${bill.billNumber}? All stock will be restored.`}
        confirmText="Cancel Bill" cancelText="Close" isDangerous={true}
        onConfirm={handleCancel} onCancel={() => setIsCancelDialogOpen(false)} />
    </PageTransition>
  );
};

export default BillDetails;