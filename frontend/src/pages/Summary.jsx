import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Download, TrendingUp, TrendingDown, Package2, Clock } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionDetailsDialog from '../components/TransactionDetailsDialog';

const Summary = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [filter, setFilter] = useState('today');
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchSummary();
  }, [filter]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      let startDate = new Date();
      let endDate = new Date();
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (filter === 'yesterday') {
        startDate = subDays(startDate, 1);
        endDate = subDays(endDate, 1);
      } else if (filter === 'week') {
        startDate = startOfWeek(new Date());
      } else if (filter === 'month') {
        startDate = startOfMonth(new Date());
      }

      const res = await axios.get(`http://${window.location.hostname}:5001/api/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, config);
      setSummaryData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summaryData) {
    return (
      <PageTransition className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 bg-bg-secondary rounded w-1/4 mb-8"></div>
        <div className="flex space-x-2"><div className="h-10 bg-bg-secondary rounded w-20"></div><div className="h-10 bg-bg-secondary rounded w-20"></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"><div className="h-32 bg-bg-secondary rounded-[18px]"></div><div className="h-32 bg-bg-secondary rounded-[18px]"></div><div className="h-32 bg-bg-secondary rounded-[18px]"></div></div>
      </PageTransition>
    );
  }

  if (!summaryData) {
    return (
      <PageTransition className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-error font-bold text-lg">Failed to load summary data</p>
          <button onClick={fetchSummary} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">Retry</button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <div className="flex justify-between items-end mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Business Summary</h1>
          <p className="text-sm text-text-secondary mt-1">Real-time ledger and performance overview</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden md:flex btn-secondary">
          <Download size={18} className="mr-2" /> Export PDF
        </motion.button>
      </div>

      {/* Premium Filters */}
      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        {['today', 'yesterday', 'week', 'month'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
              filter === f 
                ? 'bg-primary text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] scale-105' 
                : 'bg-white text-text-secondary border border-border hover:bg-bg-secondary hover:text-text-primary'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={filter} 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="premium-card p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                <TrendingUp size={120} className="text-emerald-500" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="bg-success/10 p-3 rounded-xl text-success">
                  <TrendingUp size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Incoming</span>
              </div>
              <p className="text-4xl font-black text-text-primary relative z-10 tracking-tight">{summaryData.totalIncoming}</p>
              <p className="text-sm font-medium text-text-secondary mt-1">Bags Received</p>
            </div>
            
            <div className="premium-card p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                <TrendingDown size={120} className="text-error" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="bg-error/10 p-3 rounded-xl text-error">
                  <TrendingDown size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Outgoing</span>
              </div>
              <p className="text-4xl font-black text-text-primary relative z-10 tracking-tight">{summaryData.totalOutgoing}</p>
              <p className="text-sm font-medium text-text-secondary mt-1">Bags Billed</p>
            </div>
            
            <div className="premium-card p-6 relative overflow-hidden group bg-gradient-to-br from-bg-primary to-primary/5">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                <Package2 size={120} className="text-primary" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="bg-primary/10 p-3 rounded-xl text-primary">
                  <Package2 size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Total Stock</span>
              </div>
              <p className="text-4xl font-black text-text-primary relative z-10 tracking-tight">{summaryData.currentAvailableStock}</p>
              <p className="text-sm font-medium text-text-secondary mt-1">Total Available Inventory</p>
            </div>
          </div>

          {/* Ledger Grid */}
          <div className="premium-card p-0 overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-bg-secondary/30">
              <h3 className="font-bold text-text-primary text-lg">Transaction Ledger</h3>
              <div className="flex items-center space-x-2 text-sm text-text-secondary font-medium">
                <Clock size={16} />
                <span>For selected period</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 bg-bg-secondary p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border">
                  <div className="col-span-6 pl-4">Brand / Variant</div>
                  <div className="col-span-3 text-center">Incoming (Received)</div>
                  <div className="col-span-3 text-center">Outgoing (Billed)</div>
                </div>
                
                {/* Body Rows */}
                <div className="divide-y divide-border">
                  {summaryData.incomingTransactions.length === 0 && summaryData.outgoingTransactions.length === 0 ? (
                    <div className="p-12 text-center text-text-secondary font-medium italic">
                      No transactions found for this period.
                    </div>
                  ) : (
                    // Merge incoming and outgoing to create a unified ledger view
                    (() => {
                      const ledgerMap = new Map();
                      
                      summaryData.incomingTransactions.forEach(item => {
                        ledgerMap.set(item._id._id, { 
                          name: item._id.name, 
                          variant: item._id.variant, 
                          incoming: item.totalQuantity, 
                          outgoing: 0 
                        });
                      });
                      
                      summaryData.outgoingTransactions.forEach(item => {
                        if (ledgerMap.has(item._id._id)) {
                          ledgerMap.get(item._id._id).outgoing = item.totalQuantity;
                        } else {
                          ledgerMap.set(item._id._id, { 
                            name: item._id.name, 
                            variant: item._id.variant, 
                            incoming: 0, 
                            outgoing: item.totalQuantity 
                          });
                        }
                      });

                      return Array.from(ledgerMap.values()).map((row, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-bg-secondary/50 transition-colors">
                          <div className="col-span-6 pl-4">
                            <p className="font-bold text-text-primary text-base">{row.name}</p>
                            <p className="text-sm font-medium text-text-secondary">{row.variant}</p>
                          </div>
                          <div className="col-span-3 flex justify-center">
                            {row.incoming > 0 ? (
                              <span className="px-3 py-1 bg-success/10 text-success font-bold rounded-lg">+ {row.incoming}</span>
                            ) : (
                              <span className="text-border font-bold">-</span>
                            )}
                          </div>
                          <div className="col-span-3 flex justify-center">
                            {row.outgoing > 0 ? (
                              <span className="px-3 py-1 bg-error/10 text-error font-bold rounded-lg">- {row.outgoing}</span>
                            ) : (
                              <span className="text-border font-bold">-</span>
                            )}
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* All Individual Transactions */}
          <div className="premium-card p-0 overflow-hidden mt-8">
            <div className="p-6 border-b border-border flex justify-between items-center bg-bg-secondary/30">
              <h3 className="font-bold text-text-primary text-lg">Detailed Transactions</h3>
              <div className="flex items-center space-x-2 text-sm text-text-secondary font-medium">
                <Clock size={16} />
                <span>For selected period</span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {summaryData.allTransactions && summaryData.allTransactions.length > 0 ? (
                summaryData.allTransactions.map(tx => (
                  <div 
                    key={tx._id} 
                    onClick={() => setSelectedTransaction(tx)}
                    className="flex justify-between items-center p-4 rounded-[14px] border border-border bg-bg-secondary/30 hover:bg-bg-secondary transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center">
                      <div className={`h-12 w-12 rounded-[12px] flex items-center justify-center mr-4 shadow-sm ${tx.type === 'IN' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                        {tx.type === 'IN' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-text-primary">
                          {tx.brand?.name} - {tx.brand?.variant}
                        </p>
                        <p className="text-sm font-medium mt-0.5">
                          {tx.type === 'IN' ? 'Stock Added' : 'Billed Out'} 
                          <span className={`ml-2 text-xs font-black ${tx.type === 'IN' ? 'text-success' : 'text-primary'}`}>
                            {tx.type === 'IN' ? '+' : '-'}{tx.quantity} Bags
                          </span>
                        </p>
                        <p className="text-xs text-text-secondary mt-1 font-medium">{format(new Date(tx.createdAt), 'dd MMM yyyy, hh:mm a')} • By {tx.admin?.name || 'Admin'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-secondary uppercase tracking-widest font-bold">Balance</p>
                      <p className="font-black text-lg text-text-primary">{tx.currentStock}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-text-secondary py-12 font-medium border-2 border-dashed border-border rounded-xl">
                  No individual transactions found for this period.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <TransactionDetailsDialog 
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </PageTransition>
  );
};

export default Summary;

