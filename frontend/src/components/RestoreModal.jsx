import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Square, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const RestoreModal = ({ isOpen, onClose, fileId, onRestoreComplete, userToken }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState({ bills: [], stocks: [] });
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedStockIds, setSelectedStockIds] = useState([]);
  const [step, setStep] = useState(1); // 1: Loading preview, 2: Select records, 3: Conflict resolution
  const [resolutionMode, setResolutionMode] = useState('Skip');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('bills');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Load preview data when modal opens
  React.useEffect(() => {
    if (isOpen && fileId) {
      loadPreview();
    } else {
      // Reset state
      setStep(1);
      setRecords({ bills: [], stocks: [] });
      setSelectedIds([]);
      setSelectedStockIds([]);
      setResolutionMode('Skip');
      setSearchTerm('');
      setActiveTab('bills');
      setFromDate('');
      setToDate('');
    }
  }, [isOpen, fileId]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/backups/restore-preview`,
        { fileId },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setRecords(res.data.records);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load backup preview');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleStockSelection = (id) => {
    if (selectedStockIds.includes(id)) {
      setSelectedStockIds(selectedStockIds.filter(i => i !== id));
    } else {
      setSelectedStockIds([...selectedStockIds, id]);
    }
  };

  const toggleAll = () => {
    if (activeTab === 'bills') {
      if (selectedIds.length === filteredBills.length) {
        setSelectedIds([]);
      } else {
        setSelectedIds(filteredBills.map(r => r._id));
      }
    } else {
      if (selectedStockIds.length === filteredStocks.length) {
        setSelectedStockIds([]);
      } else {
        setSelectedStockIds(filteredStocks.map(r => r._id));
      }
    }
  };

  const filteredBills = records.bills.filter(b => {
    const matchesSearch = (b.billNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (b.millName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (b.partyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
                          
    let matchesDate = true;
    if (fromDate || toDate) {
      const recordDate = new Date(b.date);
      recordDate.setHours(0,0,0,0);
      if (fromDate) {
        const fDate = new Date(fromDate);
        fDate.setHours(0,0,0,0);
        if (recordDate < fDate) matchesDate = false;
      }
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(0,0,0,0);
        if (recordDate > tDate) matchesDate = false;
      }
    }
    return matchesSearch && matchesDate;
  });

  const filteredStocks = records.stocks.filter(s => {
    const matchesSearch = (s.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (s.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
                          
    let matchesDate = true;
    if (fromDate || toDate) {
      const recordDate = new Date(s.createdAt);
      recordDate.setHours(0,0,0,0);
      if (fromDate) {
        const fDate = new Date(fromDate);
        fDate.setHours(0,0,0,0);
        if (recordDate < fDate) matchesDate = false;
      }
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(0,0,0,0);
        if (recordDate > tDate) matchesDate = false;
      }
    }
    return matchesSearch && matchesDate;
  });

  const handleRestore = async () => {
    if (selectedIds.length === 0 && selectedStockIds.length === 0) {
      toast.error('Please select at least one bill or stock transaction to restore');
      return;
    }
    
    if (step === 2) {
      setStep(3); // move to conflict resolution
      return;
    }

    try {
      setLoading(true);
      
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/backups/restore-confirm`,
        { recordIds: selectedIds, stockIds: selectedStockIds, resolutionMode },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      toast.success(`Restored: ${res.data.restoredCount} Bills, ${res.data.stocksRestored} Stocks. Skipped: ${res.data.skippedCount} Bills, ${res.data.stocksSkipped} Stocks.`);
      onRestoreComplete();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Restore failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex justify-between items-center bg-bg-secondary rounded-t-2xl">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Restore Backup</h2>
              <p className="text-sm text-text-secondary mt-1">
                {step === 1 ? 'Loading backup file...' : step === 2 ? 'Select billing records to restore' : 'Configure conflict resolution'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-text-secondary hover:bg-border rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-text-secondary font-medium">Processing...</p>
              </div>
            ) : step === 2 ? (
              <div>
                <div className="flex border-b border-border mb-4">
                  <button 
                    onClick={() => { setActiveTab('bills'); setSearchTerm(''); }}
                    className={`px-4 py-3 font-bold transition-colors ${activeTab === 'bills' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Bills ({records.bills.length})
                  </button>
                  <button 
                    onClick={() => { setActiveTab('stocks'); setSearchTerm(''); }}
                    className={`px-4 py-3 font-bold transition-colors ${activeTab === 'stocks' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Stock Transactions ({records.stocks.length})
                  </button>
                </div>

                {/* Date Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4 bg-bg-secondary p-4 rounded-xl border border-border">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-text-secondary mb-1">From Date</label>
                    <input 
                      type="date" 
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-text-secondary mb-1">To Date</label>
                    <input 
                      type="date" 
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={() => { setFromDate(''); setToDate(''); }}
                      className="px-4 py-2 bg-error/10 text-error rounded-lg font-bold hover:bg-error/20 text-sm h-[38px] flex items-center gap-1"
                    >
                      <X size={16} />
                      Clear
                    </button>
                  </div>
                </div>
              
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                  <div className="relative w-full sm:w-1/2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input 
                      type="text" 
                      placeholder={activeTab === 'bills' ? "Search bills by number, mill, or party..." : "Search stocks by type or company..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-semibold text-text-primary">
                      {activeTab === 'bills' ? selectedIds.length : selectedStockIds.length} of {activeTab === 'bills' ? filteredBills.length : filteredStocks.length} selected
                    </span>
                    <button onClick={toggleAll} className="text-sm font-bold text-primary hover:text-primary-dark transition-colors">
                      {activeTab === 'bills' 
                        ? (selectedIds.length === filteredBills.length && filteredBills.length > 0 ? 'Deselect All' : 'Select All')
                        : (selectedStockIds.length === filteredStocks.length && filteredStocks.length > 0 ? 'Deselect All' : 'Select All')}
                    </button>
                  </div>
                </div>
                
                <div className="border border-border rounded-xl shadow-sm overflow-x-auto">
                  <div className="min-w-[600px]">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-bg-secondary text-text-secondary text-sm font-semibold">
                      <tr>
                        <th className="p-4 w-12 text-center"></th>
                        {activeTab === 'bills' ? (
                          <>
                            <th className="p-4">Bill No</th>
                            <th className="p-4">Mill Name</th>
                            <th className="p-4">Party Name</th>
                            <th className="p-4">Date</th>
                          </>
                        ) : (
                          <>
                            <th className="p-4">Type</th>
                            <th className="p-4">Quantity</th>
                            <th className="p-4">Company Name</th>
                            <th className="p-4">Date</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activeTab === 'bills' ? (
                        <>
                          {filteredBills.map((record) => (
                            <tr 
                              key={record._id} 
                              onClick={() => toggleSelection(record._id)}
                              className={`cursor-pointer transition-colors hover:bg-bg-secondary ${selectedIds.includes(record._id) ? 'bg-primary/5' : ''}`}
                            >
                              <td className="p-4 text-center">
                                {selectedIds.includes(record._id) ? (
                                  <CheckSquare className="text-primary mx-auto" size={20} />
                                ) : (
                                  <Square className="text-text-secondary mx-auto" size={20} />
                                )}
                              </td>
                              <td className="p-4 font-medium text-text-primary">{record.billNumber}</td>
                              <td className="p-4 text-text-secondary">{record.millName}</td>
                              <td className="p-4 text-text-secondary">{record.partyName}</td>
                              <td className="p-4 text-text-secondary">{new Date(record.date).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                            </tr>
                          ))}
                          {filteredBills.length === 0 && (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-text-secondary">No bills found.</td>
                            </tr>
                          )}
                        </>
                      ) : (
                        <>
                          {filteredStocks.map((record) => (
                            <tr 
                              key={record._id} 
                              onClick={() => toggleStockSelection(record._id)}
                              className={`cursor-pointer transition-colors hover:bg-bg-secondary ${selectedStockIds.includes(record._id) ? 'bg-primary/5' : ''}`}
                            >
                              <td className="p-4 text-center">
                                {selectedStockIds.includes(record._id) ? (
                                  <CheckSquare className="text-primary mx-auto" size={20} />
                                ) : (
                                  <Square className="text-text-secondary mx-auto" size={20} />
                                )}
                              </td>
                              <td className="p-4 font-medium text-text-primary">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${record.type === 'IN' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                                  {record.type}
                                </span>
                              </td>
                              <td className="p-4 text-text-secondary font-bold">{record.quantity}</td>
                              <td className="p-4 text-text-secondary">{record.companyName || '-'}</td>
                              <td className="p-4 text-text-secondary">{new Date(record.createdAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                            </tr>
                          ))}
                          {filteredStocks.length === 0 && (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-text-secondary">No stock transactions found.</td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            ) : step === 3 ? (
              <div className="max-w-xl mx-auto py-4">
                <div className="bg-warning/10 border border-warning rounded-xl p-4 mb-6 flex items-start space-x-3">
                  <AlertCircle className="text-warning mt-0.5" size={20} />
                  <div>
                    <h3 className="font-bold text-warning-dark">Warning: Existing Records</h3>
                    <p className="text-sm text-warning-dark mt-1">What should happen if a restored bill already exists in the production database?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'Skip', title: 'Skip Existing', desc: 'Do not restore records that already exist.' },
                    { id: 'Replace', title: 'Replace Existing', desc: 'Overwrite the existing production record.' },
                    { id: 'Create Copy', title: 'Create Copy', desc: 'Restore as a new record with a new Bill No.' }
                  ].map((option) => (
                    <div 
                      key={option.id}
                      onClick={() => setResolutionMode(option.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        resolutionMode === option.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-text-secondary/30'
                      }`}
                    >
                      <div>
                        <h4 className={`font-bold ${resolutionMode === option.id ? 'text-primary' : 'text-text-primary'}`}>{option.title}</h4>
                        <p className="text-sm text-text-secondary mt-1">{option.desc}</p>
                      </div>
                      {resolutionMode === option.id && <CheckCircle2 className="text-primary" size={24} />}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex justify-end space-x-3 bg-bg-secondary rounded-b-2xl">
            <button
              onClick={() => step === 3 ? setStep(2) : onClose()}
              className="px-5 py-2.5 rounded-xl font-bold text-text-secondary hover:bg-border transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {step === 3 ? 'Back' : 'Cancel'}
            </button>
            <button
              onClick={handleRestore}
              disabled={loading || (step === 2 && selectedIds.length === 0 && selectedStockIds.length === 0)}
              className="px-5 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center shadow-lg shadow-primary/30"
            >
              {step === 2 ? 'Next: Review' : 'Confirm Restore'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RestoreModal;
