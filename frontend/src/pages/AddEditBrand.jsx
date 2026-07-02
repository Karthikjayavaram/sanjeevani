import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Lock, ImagePlus, ChevronDown, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import ConfirmDialog from '../components/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import ImageEditorModal from '../components/ImageEditorModal';

const VARIANT_OPTIONS = [
  '5 kg with handle',
  '5 kg without handle',
  '10 kg with handle',
  '10 kg without handle',
  '26 kg 2 side box',
  '26 kg 1 side',
  '30 kg 2 side box',
  '26 kg Fiber non woven bags',
  '26 kg 3D metallic bags',
  '50 kg bags',
];

const AddEditBrand = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  // Brand Level State
  const [brandName, setBrandName] = useState('');
  const [brandImage, setBrandImage] = useState('https://placehold.co/400x300?text=Brand+Image');
  
  // Variants State
  const [variants, setVariants] = useState([
    { id: Date.now(), variant: '', isCustomVariant: false, minStockAlert: 10, currentStock: 0 }
  ]);

  const [lockedBy, setLockedBy] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState(null);
  
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
            const reader = new FileReader();
            reader.onload = () => {
              setEditorImageSrc(reader.result);
              setEditorModalOpen(true);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [user, lockedBy, uploadingImage]); 

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
      }

      const handleBrandUnlocked = (data) => {
        if (data.brandId === id) {
          setLockedBy(null);
          socket.emit('lock_brand', { brandId: id, adminName: user.name });
        }
      }

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
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/brands/${id}`, config);
      const data = res.data;
      
      const isCustom = data.variant && !VARIANT_OPTIONS.includes(data.variant);
      
      setBrandName(data.name || '');
      setBrandImage(data.image || 'https://placehold.co/400x300?text=Brand+Image');
      
      setVariants([{
        id: Date.now(),
        variant: data.variant || '',
        isCustomVariant: isCustom,
        minStockAlert: data.minStockAlert || 10,
        currentStock: data.currentStock || 0
      }]);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load brand');
    }
  };

  const handleVariantChange = (id, field, value) => {
    setVariants(prev => prev.map(v => {
      if (v.id === id) {
        if (field === 'variant') {
          if (value === '__custom__') {
            return { ...v, isCustomVariant: true, variant: '' };
          } else {
            return { ...v, isCustomVariant: false, variant: value };
          }
        }
        return { ...v, [field]: value };
      }
      return v;
    }));
  };

  const addVariant = () => {
    setVariants(prev => [...prev, {
      id: Date.now(),
      variant: '',
      isCustomVariant: false,
      minStockAlert: 10,
      currentStock: 0
    }]);
  };

  const removeVariant = (id) => {
    if (variants.length > 1) {
      setVariants(prev => prev.filter(v => v.id !== id));
    }
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (lockedBy) return;
    
    // Validate variants
    for (const v of variants) {
      if (!v.variant.trim()) {
        toast.error("Please fill in all variant names");
        return;
      }
    }

    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmDialogOpen(false);
    if (lockedBy) return; 
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      if (isEdit) {
        // Edit flow
        const variantData = variants[0];
        await axios.put(`${import.meta.env.VITE_API_URL}/brands/${id}`, {
          name: brandName,
          image: brandImage,
          variant: variantData.variant,
          minStockAlert: variantData.minStockAlert
        }, config);
        
        if (socket) socket.emit('unlock_brand', { brandId: id });
        toast.success('Brand updated successfully');
      } else {
        // Create multiple variants flow
        const promises = variants.map(v => {
          return axios.post(`${import.meta.env.VITE_API_URL}/brands`, {
            name: brandName,
            image: brandImage,
            variant: v.variant,
            currentStock: v.currentStock,
            minStockAlert: v.minStockAlert
          }, config);
        });
        
        await Promise.all(promises);
        toast.success(`Successfully added ${variants.length} brand variant(s)`);
      }
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save brand(s)');
    }
  };

  const uploadImage = async (file) => {
    if (!file || lockedBy || uploadingImage) return;
    
    setUploadingImage(true);
    const uploadData = new FormData();
    uploadData.append('image', file, file.name || 'image.jpg');

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/upload`, uploadData, config);
      setBrandImage(res.data.url);
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
      const reader = new FileReader();
      reader.onload = () => {
        setEditorImageSrc(reader.result);
        setEditorModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
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
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {isEdit ? 'Edit Brand' : 'Add New Brand'}
        </h1>
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

      <form onSubmit={handleSubmitRequest} className="space-y-6">
        {/* Brand Details Card */}
        <div className="premium-card p-6 md:p-8">
          <h2 className="text-lg font-bold text-text-primary mb-6">Brand Details</h2>
          <div className="space-y-6">
            <div className="relative">
              <input type="text" id="brandName" required value={brandName} onChange={(e) => setBrandName(e.target.value)} disabled={!!lockedBy} className="floating-input" placeholder=" " />
              <label htmlFor="brandName" className="floating-label">Brand Name *</label>
            </div>
            
            {/* Image Upload UI */}
            <div>
              <label className="text-sm font-semibold text-text-secondary mb-3 block">Brand Image</label>
              
              <div 
                className="mt-2 flex flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-border px-6 py-10 bg-bg-secondary hover:bg-bg-secondary/50 transition-colors relative cursor-pointer group"
                onClick={() => !lockedBy && !uploadingImage && fileInputRef.current?.click()}
              >
                {brandImage && !brandImage.includes('placehold.co') ? (
                  <div className="relative inline-block mb-4 group/img">
                     <img src={brandImage} alt="Preview" className="mx-auto h-40 w-40 object-cover rounded-2xl shadow-md border-4 border-white" />
                     <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                       <button
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           setEditorImageSrc(brandImage);
                           setEditorModalOpen(true);
                         }}
                         className="px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors text-sm shadow-md"
                       >
                         Edit Photo
                       </button>
                       <span className="text-white text-xs font-medium">or click to change</span>
                     </div>
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

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileInputChange} />
              </div>
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <div className="space-y-4">
          <AnimatePresence>
            {variants.map((v, index) => (
              <motion.div 
                key={v.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="premium-card p-6 border border-border/50 relative overflow-hidden"
              >
                {!isEdit && variants.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeVariant(v.id)}
                    className="absolute top-4 right-4 text-text-secondary hover:text-error bg-bg-secondary hover:bg-error-light p-2 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                
                <h3 className="font-bold text-text-primary mb-5 flex items-center">
                  <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">
                    {index + 1}
                  </span>
                  Variant Details
                </h3>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Variant *</label>
                    <div className="relative">
                      <select
                        required={!v.isCustomVariant}
                        disabled={!!lockedBy}
                        value={v.isCustomVariant ? '__custom__' : v.variant}
                        onChange={(e) => handleVariantChange(v.id, 'variant', e.target.value)}
                        className="w-full appearance-none bg-bg-secondary border border-border rounded-xl px-4 py-3 pr-10 text-sm font-medium text-text-primary focus:outline-none focus:border-primary/60 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="" disabled>Select a variant...</option>
                        {VARIANT_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="__custom__">➕ Create new variant...</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                    </div>

                    {v.isCustomVariant && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-center mt-2">
                        <div className="relative flex-1">
                          <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                          <input
                            type="text"
                            required
                            autoFocus
                            disabled={!!lockedBy}
                            value={v.variant}
                            onChange={(e) => handleVariantChange(v.id, 'variant', e.target.value)}
                            placeholder="Type new variant name..."
                            className="w-full bg-primary/5 border border-primary/40 rounded-xl pl-9 pr-4 py-3 text-sm font-medium text-text-primary focus:outline-none focus:border-primary disabled:opacity-50"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVariantChange(v.id, 'variant', '')}
                          className="px-3 py-3 rounded-xl text-xs font-bold text-text-secondary bg-bg-secondary hover:bg-border/50 border border-border transition-colors whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </motion.div>
                    )}

                    {v.variant && !v.isCustomVariant && (
                      <p className="text-xs text-text-secondary font-medium pl-1">
                        Selected: <span className="font-bold text-primary">{v.variant}</span>
                      </p>
                    )}
                  </div>

                  {!isEdit && (
                    <div className="relative">
                      <input 
                        type="number" 
                        required 
                        min="0" 
                        value={v.currentStock} 
                        onChange={(e) => handleVariantChange(v.id, 'currentStock', e.target.value)} 
                        disabled={!!lockedBy} 
                        className="floating-input" 
                        placeholder=" " 
                      />
                      <label className="floating-label">Initial Stock (Bags) *</label>
                    </div>
                  )}

                  <div className="relative">
                    <input 
                      type="number" 
                      value={v.minStockAlert} 
                      onChange={(e) => handleVariantChange(v.id, 'minStockAlert', e.target.value)} 
                      disabled={!!lockedBy} 
                      className="floating-input" 
                      placeholder=" " 
                    />
                    <label className="floating-label">Minimum Stock Alert</label>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {!isEdit && (
            <motion.button
              type="button"
              onClick={addVariant}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-4 border-2 border-dashed border-primary/30 text-primary font-bold rounded-[18px] bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center"
            >
              <Plus size={20} className="mr-2" /> Add Another Variant
            </motion.button>
          )}
        </div>

        <motion.button 
          whileHover={!lockedBy && !uploadingImage ? { scale: 1.02 } : {}}
          whileTap={!lockedBy && !uploadingImage ? { scale: 0.98 } : {}}
          type="submit" 
          disabled={!!lockedBy || uploadingImage} 
          className={`w-full btn-primary text-lg shadow-xl ${lockedBy || uploadingImage ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <Save className="mr-2" /> {uploadingImage ? 'Uploading image...' : (isEdit ? 'Update Brand' : `Save ${variants.length > 1 ? variants.length + ' Brands' : 'Brand'}`)}
        </motion.button>
      </form>

      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={isEdit ? "Confirm Update" : `Confirm ${variants.length > 1 ? 'Brands' : 'Brand'}`}
        message={isEdit ? `Are you sure you want to update ${brandName}?` : `Are you sure you want to create ${variants.length > 1 ? `these ${variants.length} variants for ` : ''}${brandName}?`}
        confirmText={isEdit ? "Update" : "Create"}
        cancelText="Cancel"
        isDangerous={false}
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmDialogOpen(false)}
      />

      <ImageEditorModal
        isOpen={editorModalOpen}
        imageSrc={editorImageSrc}
        onCancel={() => {
          setEditorModalOpen(false);
          setEditorImageSrc(null);
        }}
        onSave={(croppedBlob) => {
          setEditorModalOpen(false);
          setEditorImageSrc(null);
          uploadImage(croppedBlob);
        }}
      />
    </PageTransition>
  );
};

export default AddEditBrand;
