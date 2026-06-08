import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ArrowLeft,
  Flashlight,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Hash,
  Zap,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { scanQRCode, scanLateEntry } from '../../services/api.service';
import { useActionLock } from '../../context/ActionLockContext';
import { cn } from '../../utils/cn';

export default function SecurityScanner() {
  usePageTitle('QR Scanner');
  const navigate = useNavigate();
  const { getUserId, user } = useAuth();
  const { error: showError } = useToast();
  const { withLock } = useActionLock();
  const securityId = getUserId();

  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [showManual, setShowManual] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Auto-start scanner on mount
    startScanner();
    return () => { stopScanner(); };
  }, []);

  const startScanner = async () => {
    setScanResult(null);
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const el = document.getElementById('sec-reader');
        if (!el) throw new Error('No element');
        scannerRef.current = new Html5Qrcode('sec-reader');
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 260, height: 260 } },
          handleScanSuccess,
          () => {},
        );
      } catch {
        setIsScanning(false);
        showError('Camera Error', 'Could not access camera.');
      }
    }, 300);
  };

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (code: string) => {
    stopScanner();
    await processCode(code, false);
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    await processCode(manualCode.trim(), true);
  };

  const processCode = async (code: string, isManual: boolean) => {
    await withLock(async () => {
      try {
        const res = isManual
          ? await scanLateEntry(code, securityId)
          : await scanQRCode(code, securityId);
        const ok = res.success === true || (res as any).status === 'SUCCESS';
        setScanResult({
          success: ok,
          message: res.message || (ok ? 'Access Granted' : 'Access Denied'),
          data: (res as any).data || res,
        });
        if ('vibrate' in navigator) navigator.vibrate(ok ? [100] : [100, 50, 100]);
        setManualCode('');
        setShowManual(false);
      } catch {
        setScanResult({ success: false, message: 'Scan Failed' });
      }
    }, 'Processing...');
  };

  const reset = () => {
    setScanResult(null);
    setShowManual(false);
    startScanner();
  };

  // ── Result overlay ─────────────────────────────────────────────────────────
  if (scanResult) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{
          background: scanResult.success
            ? 'linear-gradient(135deg, #0a1628 0%, #0d2137 100%)'
            : 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 100%)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="flex flex-col items-center px-8 text-center"
        >
          {/* Icon */}
          <div className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl',
            scanResult.success
              ? 'bg-cyan-500/20 border-2 border-cyan-400'
              : 'bg-rose-500/20 border-2 border-rose-400',
          )}>
            {scanResult.success
              ? <CheckCircle className="w-12 h-12 text-cyan-400" />
              : <XCircle className="w-12 h-12 text-rose-400" />
            }
          </div>

          {/* Status */}
          <h2 className={cn(
            'text-[28px] font-black uppercase tracking-tight mb-2',
            scanResult.success ? 'text-cyan-400' : 'text-rose-400',
          )}>
            {scanResult.success ? 'Access Granted' : 'Access Denied'}
          </h2>
          <p className="text-white/50 text-[13px] font-medium mb-6">
            {scanResult.message}
          </p>

          {/* Person info */}
          {scanResult.data?.personName && (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-8 w-full max-w-xs">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Identity</p>
              <p className="text-white text-[18px] font-black uppercase">{scanResult.data.personName}</p>
              {scanResult.data.personType && (
                <p className="text-white/50 text-[11px] font-bold uppercase tracking-widest mt-1">
                  {scanResult.data.personType}
                </p>
              )}
            </div>
          )}

          {/* Scan next */}
          <button
            onClick={reset}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-white/10 border border-white/20 text-white font-black text-[13px] uppercase tracking-widest active:scale-95 transition-transform"
          >
            <RefreshCcw className="w-4 h-4" />
            Scan Next
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main scanner UI ────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-[#050d1a] flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 h-[60px] shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white active:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[16px] font-bold text-white">Scanner</span>
        </button>
        {/* Flashlight placeholder — visual only */}
        <button className="w-9 h-9 flex items-center justify-center text-white/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6l-6 6" /><path d="M6 18l6-6" />
            <rect x="2" y="14" width="8" height="8" rx="2" />
            <path d="M10 14l4-4" /><path d="M14 2l8 8-4 4" />
          </svg>
        </button>
      </div>

      {/* ── Camera feed (hidden behind overlay) ────────── */}
      <div id="sec-reader" className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" />

      {/* ── Main content ───────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">

        {/* Hint text */}
        <p className="text-white/40 text-[13px] font-medium mb-8 tracking-wide">
          Scan to Sign In
        </p>

        {/* Scan frame */}
        <div className="relative w-[300px] h-[300px]">
          {/* Subtle dark background for the frame area */}
          <div className="absolute inset-0 rounded-2xl bg-white/[0.02]" />

          {/* Cyan corner brackets */}
          {/* Top-left */}
          <span className="absolute top-0 left-0 w-12 h-12 border-t-[3px] border-l-[3px] border-cyan-400 rounded-tl-2xl"
            style={{ boxShadow: '-2px -2px 12px rgba(0,255,255,0.3)' }} />
          {/* Top-right */}
          <span className="absolute top-0 right-0 w-12 h-12 border-t-[3px] border-r-[3px] border-cyan-400 rounded-tr-2xl"
            style={{ boxShadow: '2px -2px 12px rgba(0,255,255,0.3)' }} />
          {/* Bottom-left */}
          <span className="absolute bottom-0 left-0 w-12 h-12 border-b-[3px] border-l-[3px] border-cyan-400 rounded-bl-2xl"
            style={{ boxShadow: '-2px 2px 12px rgba(0,255,255,0.3)' }} />
          {/* Bottom-right */}
          <span className="absolute bottom-0 right-0 w-12 h-12 border-b-[3px] border-r-[3px] border-cyan-400 rounded-br-2xl"
            style={{ boxShadow: '2px 2px 12px rgba(0,255,255,0.3)' }} />

          {/* Animated cyan scan line */}
          <motion.div
            animate={{ top: ['8%', '88%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
            className="absolute left-3 right-3 h-[2px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.9), transparent)',
              boxShadow: '0 0 16px 4px rgba(0,255,255,0.5)',
            }}
          />

          {/* Active pill — centered at bottom of frame */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
            <div
              className="flex items-center gap-2 px-5 py-2 rounded-full"
              style={{
                background: 'rgba(0,255,255,0.12)',
                border: '1px solid rgba(0,255,255,0.4)',
                boxShadow: '0 0 20px rgba(0,255,255,0.2)',
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-cyan-400"
              />
              <span className="text-cyan-400 text-[11px] font-black uppercase tracking-widest">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Manual entry toggle */}
        <button
          onClick={() => setShowManual(s => !s)}
          className="mt-16 text-white/30 text-[11px] font-bold uppercase tracking-widest active:opacity-70 transition-opacity"
        >
          {showManual ? 'Hide Manual Entry' : 'Enter Code Manually'}
        </button>

        {/* Manual entry */}
        <AnimatePresence>
          {showManual && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden w-full max-w-xs mt-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter code..."
                  className="flex-1 h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-[13px] font-bold placeholder:text-white/20 outline-none focus:border-cyan-400/50 transition-colors uppercase tracking-widest"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  className="h-11 px-4 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 font-black text-[12px] uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
