import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src?: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

/** Full-screen enlarged view of a single image. */
export default function ImageLightbox({ src, alt = 'Preview', open, onClose }: ImageLightboxProps) {
  return createPortal(
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-8 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>
          <motion.img
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
