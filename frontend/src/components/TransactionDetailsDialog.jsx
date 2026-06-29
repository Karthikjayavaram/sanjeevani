import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Package2, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const TransactionDetailsDialog = ({ isOpen, transaction, onClose }) => {
  if (!isOpen || !transaction) return null;

  const isOut = transaction.type === 'OUT';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Dialog Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-text-secondary hover:bg-bg-secondary rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-border">
            <div className={`p-4 rounded-2xl ${isOut ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
              {isOut ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-text-primary tracking-tight">
                {isOut ? 'Stock Billed Out' : 'Stock Added'}
              </h3>
              <p className="text-sm font-medium text-text-secondary">
                {format(new Date(transaction.createdAt), 'dd MMM yyyy, hh:mm a')}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Brand Info */}
            <div>
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Item Details</h4>
              <div className="bg-bg-secondary/50 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-text-primary text-lg">{transaction.brand?.name}</p>
                  <p className="text-sm font-medium text-text-secondary">{transaction.brand?.variant}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Quantity</p>
                  <p className={`font-black text-xl ${isOut ? 'text-primary' : 'text-success'}`}>
                    {isOut ? '-' : '+'}{transaction.quantity} Bags
                  </p>
                </div>
              </div>
            </div>

            {/* Bill Info (if OUT) */}
            {isOut && transaction.referenceId && (
              <div>
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Billing Information</h4>
                <div className="bg-bg-secondary/50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-text-secondary">
                      <FileText size={16} className="mr-2" />
                      <span className="text-sm font-medium">Bill Number</span>
                    </div>
                    <p className="font-bold text-text-primary">{transaction.referenceId.billNumber}</p>
                  </div>
                  <div className="w-full h-px bg-border my-1"></div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-text-secondary">
                      <Package2 size={16} className="mr-2" />
                      <span className="text-sm font-medium">Mill Name</span>
                    </div>
                    <p className="font-bold text-text-primary text-right">{transaction.referenceId.millName}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-text-secondary">
                      <User size={16} className="mr-2" />
                      <span className="text-sm font-medium">Party Name</span>
                    </div>
                    <p className="font-bold text-text-primary text-right">{transaction.referenceId.partyName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stock Balance & Admin */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-secondary/50 p-4 rounded-xl">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Stock Balance</p>
                <p className="font-black text-lg text-text-primary">{transaction.currentStock} Bags</p>
                <p className="text-xs text-text-secondary mt-1">From {transaction.previousStock} bags</p>
              </div>
              <div className="bg-bg-secondary/50 p-4 rounded-xl">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Processed By</p>
                <p className="font-bold text-text-primary">{transaction.admin?.name || 'Admin'}</p>
              </div>
            </div>

          </div>
          
          <div className="mt-8 pt-4 border-t border-border flex justify-end">
             {isOut && transaction.referenceId && (
                <Link to={`/bills/${transaction.referenceId._id}`} className="mr-auto px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors">
                  View Full Bill
                </Link>
             )}
             <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-text-primary hover:bg-black transition-colors text-sm shadow-md"
              >
                Close
              </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TransactionDetailsDialog;
