import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image as ImageIcon, Trash, X, User } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ProfilePhotoManagerProps {
  userId: string;
  currentPhoto: string | null;
  onPhotoChange: (photoUri: string | null) => void;
  size?: number;
  showEditBadge?: boolean;
}

export default function ProfilePhotoManager({
  userId,
  currentPhoto,
  onPhotoChange,
  size = 100,
  showEditBadge = true,
}: ProfilePhotoManagerProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPhotoChange(reader.result as string);
        setShowOptions(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    onPhotoChange(null);
    setShowRemoveConfirm(false);
  };

  return (
    <>
      <button 
        onClick={() => setShowOptions(true)}
        className="relative group outline-none active:scale-95 transition-transform"
        style={{ width: size, height: size }}
      >
        <div 
          className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-lg flex items-center justify-center"
        >
          {currentPhoto ? (
            <img src={currentPhoto} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="text-slate-300 dark:text-slate-600" style={{ width: size * 0.5, height: size * 0.5 }} />
          )}
        </div>
        
        {showEditBadge && (
          <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--color-primary)] border-3 border-white dark:border-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Camera className="w-4 h-4 text-white" />
          </div>
        )}
      </button>

      {/* Options Sheet */}
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="fixed inset-0 z-[160] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[170] bg-white dark:bg-slate-950 rounded-t-[32px] overflow-hidden"
            >
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Profile Photo</h3>
                  <p className="text-sm font-medium text-slate-500">Choose an option</p>
                </div>

                <div className="space-y-3">
                  <label className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl cursor-pointer active:scale-[0.98] transition-all group">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <Camera className="w-6 h-6 text-[var(--color-primary)]" />
                    </div>
                    <span className="text-base font-bold text-slate-900 dark:text-white">Take Photo</span>
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                  </label>

                  <label className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl cursor-pointer active:scale-[0.98] transition-all group">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-6 h-6 text-[var(--color-primary)]" />
                    </div>
                    <span className="text-base font-bold text-slate-900 dark:text-white">Choose from Gallery</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>

                  {currentPhoto && (
                    <button 
                      onClick={() => { setShowOptions(false); setTimeout(() => setShowRemoveConfirm(true), 300); }}
                      className="w-full flex items-center gap-4 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl active:scale-[0.98] transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <Trash className="w-6 h-6 text-rose-500" />
                      </div>
                      <span className="text-base font-bold text-rose-500">Remove Photo</span>
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => setShowOptions(false)}
                  className="w-full mt-6 py-4.5 bg-slate-100 dark:bg-slate-900 rounded-2xl text-base font-bold text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Remove Confirm Modal */}
      <AnimatePresence>
        {showRemoveConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRemoveConfirm(false)}
              className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[190] w-[320px] bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl"
            >
              <div className="p-7 text-center">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Remove Photo</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Are you sure you want to remove your profile photo?
                </p>
              </div>
              <div className="flex border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setShowRemoveConfirm(false)}
                  className="flex-1 py-4.5 text-base font-bold text-slate-500 dark:text-slate-400 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={removePhoto}
                  className="flex-1 py-4.5 text-base font-black text-white bg-rose-500 active:bg-rose-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
