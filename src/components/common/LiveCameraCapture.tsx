import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, Check, X, User, AlertCircle } from 'lucide-react';
import { compressImageSrc } from '../../utils/imageCompression';
import { cn } from '../../utils/cn';

interface LiveCameraCaptureProps {
  /** Confirmed, compressed JPEG data URL — or '' when none captured yet. */
  value: string;
  onChange: (photo: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

type Phase = 'idle' | 'streaming' | 'preview';

/**
 * Mandatory live camera capture: open → capture → preview → retake → confirm.
 * Gallery/file selection is intentionally not offered — the photo must be taken
 * live. Uses getUserMedia and always tears the stream down on unmount so the
 * camera light never stays on after the user leaves.
 */
export default function LiveCameraCapture({
  value,
  onChange,
  label = 'Visitor Photo',
  required = true,
  className,
}: LiveCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopStream(), []);

  const openCamera = async () => {
    setError('');
    setDraft('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported on this device or browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase('streaming');
      // Video element mounts with the streaming phase; attach on next tick.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (e: any) {
      const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      setError(
        denied
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not start the camera. Please check your device and try again.',
      );
      setPhase('idle');
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const raw = canvas.toDataURL('image/jpeg', 0.92);
      const compressed = await compressImageSrc(raw);
      setDraft(compressed);
      stopStream();
      setPhase('preview');
    } finally {
      setBusy(false);
    }
  };

  const retake = () => {
    setDraft('');
    openCamera();
  };

  const confirm = () => {
    onChange(draft);
    setDraft('');
    setPhase('idle');
  };

  const cancel = () => {
    stopStream();
    setDraft('');
    setError('');
    setPhase('idle');
  };

  const clearConfirmed = () => onChange('');

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <button
            type="button"
            onClick={clearConfirmed}
            className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retake
          </button>
        )}
      </div>

      {/* Confirmed state — circular preview */}
      {value ? (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <img
            src={value}
            alt="Captured visitor"
            className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-md dark:ring-slate-900"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13px] font-black text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" /> Photo captured
            </p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">
              Tap “Retake” to capture again.
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openCamera}
          className="group flex min-h-[82px] w-full items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/78 px-4 py-4 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)] transition-all hover:border-blue-300 hover:bg-blue-50/45 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-blue-800"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-transform group-hover:-translate-y-0.5 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
            <Camera className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black text-slate-900 dark:text-white">Open Camera & Capture</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">
              Live capture required — take the visitor’s photo now.
            </p>
          </div>
        </button>
      )}

      {error && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-rose-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {/* Camera modal — streaming + preview */}
      <AnimatePresence>
        {(phase === 'streaming' || phase === 'preview') && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={cancel}
            />
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-slate-900"
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h3 className="text-[15px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {phase === 'preview' ? 'Preview Photo' : 'Capture Photo'}
                </h3>
                <button
                  type="button"
                  onClick={cancel}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:scale-95 dark:bg-slate-800 dark:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative mx-6 aspect-[3/4] overflow-hidden rounded-3xl bg-black">
                {phase === 'streaming' ? (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <img src={draft} alt="Preview" className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                )}
                {phase === 'streaming' && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-56 w-56 rounded-full border-2 border-white/40" />
                    <User className="absolute h-10 w-10 text-white/25" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-6">
                {phase === 'streaming' ? (
                  <button
                    type="button"
                    onClick={capture}
                    disabled={busy}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-60"
                  >
                    <Camera className="h-5 w-5" /> Capture
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={retake}
                      className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-black uppercase tracking-widest text-slate-700 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <RefreshCw className="h-5 w-5" /> Retake
                    </button>
                    <button
                      type="button"
                      onClick={confirm}
                      className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                    >
                      <Check className="h-5 w-5" /> Confirm
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
