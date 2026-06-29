import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Lock, ImagePlus, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import ConfirmDialog from '../components/ConfirmDialog';
import { motion } from 'framer-motion';

const AddEditBrand = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState({
    name: '',
    variant: '',
    minStockAlert: 10,
    currentStock: 0,
    image: 'https://placehold.co/400x300?text=Brand+Image'
  });
  const [lockedBy, setLockedBy] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const hasLockRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      fetchBrandDetails();
    }
  }, [id]);

  // Handle Clipboard Image Pasting globally
  useEffect(() => {
    const handlePaste = (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          const blob = item.getAsFile();
          if (blob) {
            uploadImage(blob);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [user, formData, lockedBy, uploadingImage]); // Rebind to catch state

  useEffect(() => {
    if (isEdit && socket && user) {
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
  }, [isEdit, socket, user, id]);

  const fetchBrandDetails = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`http://${window.location.hostname}:5001/api/brands/${id}`, config);
      const data = res.data;
      setFormData({
        name: data.name || '',
        variant: data.variant || '',
        minStockAlert: data.minStockAlert || 10,
        currentStock: data.currentStock || 0,
        image: data.image || 'https://placehold.co/400x300?text=Brand+Image'
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load brand');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (lockedBy) return;
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmDialogOpen(false);
    if (lockedBy) return; 
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      if (isEdit) {
        await axios.put(`http://${window.location.hostname}:5001/api/brands/${id}`, formData, config);
        if (socket) socket.emit('unlock_brand', { brandId: id });
        toast.success('Brand updated successfully');
      } else {
        await axios.post(`http://${window.location.hostname}:5001/api/brands`, formData, config);
        toast.success('Brand added successfully');
      }
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save brand');
    }
  };

  const uploadImage = async (file) => {
    if (!file || lockedBy || uploadingImage) return;
    
    setUploadingImage(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
      const res = await axios.post(`http://${window.location.hostname}:5001/api/upload`, uploadData, config);
      setFormData(prev => ({ ...prev, image: res.data.url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadImage(file);
    }
  };

  return (
    <PageTransition className="p-4 md:p-8 space-y-8 max-w-3xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center mt-2 mb-6">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)} 
          className="mr-4 p-2.5 bg-bg-primary text-text-secondary hover:text-text-primary rounded-full shadow-sm hover:shadow-md transition-all border border-border"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{isEdit ? 'Edit Brand' : 'Add New Brand'}</h1>
      </div>

      {lockedBy && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-warning-light border border-warning/20 text-warning rounded-[18px] flex items-center shadow-sm">
          <Lock className="mr-3" size={24} />
          <div>
            <p className="font-bold">Currently locked</p>
            <p className="text-sm">Being edited by {lockedBy}</p>
          </div>
        </motion.div>
      )}

      <div className="premium-card p-6 md:p-8">
        <form onSubmit={handleSubmitRequest} className="space-y-6">
          <div className="space-y-5">
            <div className="relative">
              <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange} disabled={!!lockedBy} className="floating-input" placeholder=" " />
              <label htmlFor="name" className="floating-label">Brand Name *</label>
            </div>
            
            <div className="relative">
              <input type="text" id="variant" name="variant" required value={formData.variant} onChange={handleChange} disabled={!!lockedBy} className="floating-input" placeholder=" " />
              <label htmlFor="variant" className="floating-label">Variant (e.g. 26 KG) *</label>
            </div>
            
            {!isEdit && (
              <div className="relative">
                <input type="number" id="currentStock" name="currentStock" required min="0" value={formData.currentStock} onChange={handleChange} disabled={!!lockedBy} className="floating-input" placeholder=" " />
                <label htmlFor="currentStock" className="floating-label">Initial Stock (Bags) *</label>
              </div>
            )}
            
            <div className="relative">
              <input type="number" id="minStockAlert" name="minStockAlert" value={formData.minStockAlert} onChange={handleChange} disabled={!!lockedBy} className="floating-input" placeholder=" " />
              <label htmlFor="minStockAlert" className="floating-label">Minimum Stock Alert</label>
            </div>
            
            {/* Image Upload UI */}
            <div>
              <label className="text-sm font-semibold text-text-secondary mb-3 block">Brand Image</label>
              
              <div 
                className="mt-2 flex flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-border px-6 py-10 bg-bg-secondary hover:bg-bg-secondary/50 transition-colors relative cursor-pointer group"
                onClick={() => !lockedBy && !uploadingImage && fileInputRef.current?.click()}
              >
                {formData.image && !formData.image.includes('placehold.co') ? (
                  <div className="relative inline-block mb-4">
                     <img src={formData.image} alt="Preview" className="mx-auto h-40 w-40 object-cover rounded-2xl shadow-md border-4 border-white" />
                  </div>
                ) : (
                  <div className="bg-primary/5 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <ImagePlus className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
                  </div>
                )}
                
                <div className="text-center">
                  <p className="text-base font-bold text-text-primary">
                    {uploadingImage ? 'Uploading...' : 'Click to Upload Image'}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Or simply <strong className="text-primary">paste an image</strong> from your clipboard (Ctrl+V)
                  </p>
                </div>

                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileInputChange} 
                />
              </div>
            </div>
          </div>

          <motion.button 
            whileHover={!lockedBy && !uploadingImage ? { scale: 1.02 } : {}}
            whileTap={!lockedBy && !uploadingImage ? { scale: 0.98 } : {}}
            type="submit" 
            disabled={!!lockedBy || uploadingImage} 
            className={`w-full btn-primary text-lg mt-8 shadow-xl ${lockedBy || uploadingImage ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Save className="mr-2" /> {uploadingImage ? 'Uploading image...' : (isEdit ? 'Update Brand' : 'Save Brand')}
          </motion.button>
        </form>
      </div>

      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={isEdit ? "Confirm Update" : "Confirm New Brand"}
        message={isEdit ? `Are you sure you want to update the details for ${formData.name}?` : `Are you sure you want to create the new brand ${formData.name}?`}
        confirmText={isEdit ? "Update Brand" : "Create Brand"}
        cancelText="Cancel"
        isDangerous={false}
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmDialogOpen(false)}
      />
    </PageTransition>
  );
};

export default AddEditBrand;

