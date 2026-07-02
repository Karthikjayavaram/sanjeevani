import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

async function getCroppedImg(imageElement, crop) {
  const canvas = document.createElement('canvas');
  const scaleX = imageElement.naturalWidth / imageElement.width;
  const scaleY = imageElement.naturalHeight / imageElement.height;
  
  // if crop width/height is missing or 0, just use the whole image size
  const actualCrop = (!crop || crop.width === 0 || crop.height === 0)
    ? { x: 0, y: 0, width: imageElement.width, height: imageElement.height }
    : crop;

  canvas.width = actualCrop.width * scaleX;
  canvas.height = actualCrop.height * scaleY;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    imageElement,
    actualCrop.x * scaleX,
    actualCrop.y * scaleY,
    actualCrop.width * scaleX,
    actualCrop.height * scaleY,
    0,
    0,
    actualCrop.width * scaleX,
    actualCrop.height * scaleY
  );

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, 'image/jpeg', 1);
  });
}

const ImageEditorModal = ({ isOpen, imageSrc, onCancel, onSave }) => {
  const [crop, setCrop] = useState();
  const [processing, setProcessing] = useState(false);
  const imageRef = useRef(null);

  const onImageLoad = (e) => {
    imageRef.current = e.currentTarget;
    // Set initial crop to 100% of image dimensions
    setCrop({
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  };

  const handleSave = async () => {
    if (!imageRef.current) return;
    try {
      setProcessing(true);
      const croppedImageBlob = await getCroppedImg(imageRef.current, crop);
      onSave(croppedImageBlob);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-bg-primary w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-border">
            <h3 className="font-bold text-lg text-text-primary">Edit Image</h3>
            <button onClick={onCancel} className="p-2 bg-bg-secondary hover:bg-border/50 rounded-full text-text-secondary transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Cropper Container */}
          <div className="relative w-full bg-slate-900 flex justify-center items-center overflow-auto p-4" style={{ maxHeight: '70vh' }}>
            {imageSrc && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                className="max-h-full"
              >
                <img 
                  src={imageSrc} 
                  onLoad={onImageLoad} 
                  alt="Crop Preview" 
                  crossOrigin="anonymous" 
                  style={{ maxHeight: '60vh', objectFit: 'contain' }}
                />
              </ReactCrop>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 md:p-6 bg-bg-secondary/30 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl font-bold text-text-secondary bg-bg-secondary hover:bg-border/50 transition-colors"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30 flex items-center"
              disabled={processing}
            >
              {processing ? 'Processing...' : (
                <>
                  <Check size={18} className="mr-2" /> Apply & Upload
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageEditorModal;
