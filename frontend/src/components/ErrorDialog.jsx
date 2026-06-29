import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, X } from 'lucide-react';

const ErrorDialog = ({ isOpen, title = 'Error', message, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl overflow-hidden p-6"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-text-secondary hover:bg-bg-secondary rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-start space-x-4">
            <div className="p-3 rounded-2xl bg-error/10 text-error shrink-0">
              <XCircle size={24} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-xl font-bold text-text-primary tracking-tight mb-2">{title}</h3>
              <p className="text-sm font-medium text-text-secondary leading-relaxed mb-6">
                {message}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-error hover:bg-red-600 transition-colors text-sm shadow-md"
                >
                  OK, Got it
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ErrorDialog;
