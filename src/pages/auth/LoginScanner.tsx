import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

import { extractIdentificationFromQR } from '../../utils/qrParser';

export default function LoginScanner() {
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [scanned, setScanned] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, []);

  const startScanner = async () => {
    try {
      scannerRef.current = new Html5Qrcode('login-reader');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 20, qrbox: { width: 9999, height: 9999 } }, // full area fast scan
        handleScanSuccess,
        () => {},
      );
    } catch {
      showError('Camera Error', 'Could not access camera. Please allow camera access.');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    if (scanned) return;
    const id = extractIdentificationFromQR(decodedText);
    if (!id) return;

    setScanned(true);
    if ('vibrate' in navigator) navigator.vibrate([80, 40, 80]);
    stopScanner();
    navigate('/login', { state: { scannedId: id }, replace: true });
  };

  return (
    <>
      {/* ── Suppress ALL html5-qrcode default UI ─────── */}
      <style>{`
        #login-reader {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          border: none !important;
          padding: 0 !important;
          background: #000 !important;
        }
        #login-reader video {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        /* Hide ALL library-generated UI elements */
        #login-reader img,
        #login-reader canvas,
        #login-reader div[style*="border"],
        #login-reader div[style*="background"],
        #login-reader button,
        #login-reader select,
        #login-reader span,
        #login-reader p {
          display: none !important;
        }
        /* Keep only the video */
        #login-reader > div:first-child {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          background: transparent !important;
        }
      `}</style>

      {/* Camera feed container */}
      <div id="login-reader" />

      {/* ── Overlay UI ───────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Dark vignette edges — Google Lens style */}
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 h-[60px] pointer-events-auto">
          <button
            onClick={() => navigate('/login')}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* Empty right side for balance */}
          <div className="w-10" />
        </div>

        {/* Center frame — corner brackets only, no box */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[72vw] max-w-[300px] aspect-square">
            {/* Top-left */}
            <span className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-white rounded-tl-xl" />
            {/* Top-right */}
            <span className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-white rounded-tr-xl" />
            {/* Bottom-left */}
            <span className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-white rounded-bl-xl" />
            {/* Bottom-right */}
            <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-white rounded-br-xl" />

            {/* Animated scan line */}
            <motion.div
              animate={{ top: ['6%', '88%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
              className="absolute left-2 right-2 h-[2px] rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
                boxShadow: '0 0 10px 2px rgba(255,255,255,0.4)',
              }}
            />
          </div>
        </div>

        {/* Bottom label */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-16">
          <p className="text-white text-[17px] font-semibold tracking-wide drop-shadow-lg">
            Scan ID Card
          </p>
        </div>
      </div>

      {/* Success flash */}
      <AnimatePresence>
        {scanned && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-20 bg-white/20 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </>
  );
}
