import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, RotateCcw, Plus, DatabaseBackup, Info, AlertCircle, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import RestoreModal from '../components/RestoreModal';

const BillingBackups = () => {
  const { user } = useContext(AuthContext);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [restoreFileId, setRestoreFileId] = useState(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  
  const [googleStatus, setGoogleStatus] = useState(null);

  useEffect(() => {
    fetchBackups();
    fetchGoogleStatus();
  }, []);

  const fetchGoogleStatus = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/google/status`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setGoogleStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch google status', error);
    }
  };

  const fetchBackups = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      let url = `${import.meta.env.VITE_API_URL}/backups`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setBackups(res.data);
    } catch (error) {
      toast.error('Failed to load backup history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const toastId = toast.loading('Creating backup and uploading to Google Drive...');
      await axios.post(`${import.meta.env.VITE_API_URL}/backups/manual`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success('Backup created successfully!', { id: toastId });
      fetchBackups();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to permanently delete this backup from Google Drive?')) return;
    try {
      const toastId = toast.loading('Deleting backup...');
      await axios.delete(`${import.meta.env.VITE_API_URL}/backups/${fileId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success('Backup deleted successfully', { id: toastId });
      fetchBackups();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete backup');
    }
  };

  const handleRestoreClick = (fileId) => {
    setRestoreFileId(fileId);
    setIsRestoreOpen(true);
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/google/auth`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      toast.error('Failed to initiate Google connection');
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Drive? Automatic backups will stop.')) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/google/disconnect`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success('Disconnected from Google Drive');
      fetchGoogleStatus();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto min-h-screen pb-[120px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Billing Backups</h1>
          <p className="text-text-secondary mt-1">Manage, download, and restore your automated billing backups</p>
        </div>
        
        <button 
          onClick={handleCreateBackup}
          disabled={creating || (googleStatus && googleStatus.status !== 'Connected')}
          className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-[14px] font-bold hover:bg-primary-dark transition-all shadow-[0_8px_20px_0_rgba(37,99,235,0.3)] disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-1"
        >
          {creating ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Plus size={20} />
          )}
          <span>Create Backup Now</span>
        </button>
      </div>

      {/* Google Drive Status Banner */}
      <div className={`border rounded-2xl p-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 ${googleStatus?.status === 'Connected' ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
        <div className="flex items-start space-x-3">
          <AlertCircle className={`shrink-0 mt-0.5 ${googleStatus?.status === 'Connected' ? 'text-success' : 'text-warning'}`} size={20} />
          <div>
            <h3 className={`font-bold ${googleStatus?.status === 'Connected' ? 'text-success-dark' : 'text-warning-dark'}`}>
              Google Drive Integration
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              {googleStatus?.status === 'Connected' 
                ? `Connected as ${googleStatus.email}. Backups run automatically every day.` 
                : 'Not connected. You must connect Google Drive to enable automated and manual backups.'}
            </p>
          </div>
        </div>
        <div>
          {googleStatus?.status === 'Connected' ? (
            <button 
              onClick={handleDisconnectGoogle}
              className="px-4 py-2 bg-bg-primary border border-error/30 text-error rounded-xl font-bold hover:bg-error/10 transition-colors text-sm whitespace-nowrap"
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={handleConnectGoogle}
              className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-sm flex items-center space-x-2 whitespace-nowrap"
            >
              <DatabaseBackup size={16} />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-primary rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-bg-secondary text-text-secondary text-sm font-semibold tracking-wide">
              <tr>
                <th className="p-5">Backup Name</th>
                <th className="p-5">Date & Time</th>
                <th className="p-5">Type</th>
                <th className="p-5">Size</th>
                <th className="p-5">Status</th>
                <th className="p-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-text-secondary">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-text-secondary">
                    <DatabaseBackup size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-semibold text-lg">No backups found</p>
                    <p className="text-sm mt-1">Adjust your filters or create a new backup.</p>
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup._id} className="hover:bg-bg-secondary transition-colors">
                    <td className="p-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <DatabaseBackup size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">{backup.backupName}</p>
                          <p className="text-xs text-text-secondary font-mono mt-0.5">ID: {backup.fileId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-text-secondary font-medium">
                      {new Date(backup.createdAt).toLocaleString()}
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        backup.backupType === 'Auto' ? 'bg-primary/10 text-primary' : 'bg-gray-500/10 text-gray-600'
                      }`}>
                        {backup.backupType}
                      </span>
                    </td>
                    <td className="p-5 font-mono text-sm text-text-secondary">
                      {formatBytes(backup.sizeBytes)}
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        backup.status === 'Success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {backup.status}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => handleRestoreClick(backup.fileId)}
                          disabled={backup.status !== 'Success'}
                          className="p-2 text-text-secondary hover:text-warning hover:bg-warning/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Restore"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(backup._id)}
                          className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RestoreModal 
        isOpen={isRestoreOpen} 
        onClose={() => setIsRestoreOpen(false)} 
        fileId={restoreFileId} 
        userToken={user?.token}
        onRestoreComplete={() => {
          setIsRestoreOpen(false);
          // Optional: refetch data if needed
        }}
      />

    </div>
  );
};

export default BillingBackups;
