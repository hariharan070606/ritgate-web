import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  ArrowRight,
  Fingerprint,
  QrCode,
  ChevronRight,
  Loader2,
  Zap,
  X,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { detectRole } from '../../services/api.service';
import type { UserRole } from '../../types';
import AuthShell from '../../components/auth/AuthShell';

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.32 },
  },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sendOTPRequest } = useAuth();

  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [showOtpSentModal, setShowOtpSentModal] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resolvedRole, setResolvedRole] = useState<UserRole | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [resendingModal, setResendingModal] = useState(false);
  const [modalNotice, setModalNotice] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const scannedId = (location.state as any)?.scannedId;
    if (scannedId) {
      const id = String(scannedId).trim().toUpperCase();
      setUserId(id);
      window.history.replaceState({}, '');
      setTimeout(() => handleSendOTP(id), 300);
    }
  }, []);

  const handleSendOTP = async (id?: string) => {
    const uid = (id ?? userId).trim();
    if (!uid) return;
    setLoading(true);
    setLoadMsg('Detecting role...');
    try {
      const role = await detectRole(uid);
      setResolvedRole(role);
      setLoadMsg('Sending OTP...');
      const res = await sendOTPRequest(uid, role);
      if (res.success) {
        setMaskedEmail(res.email || (res as any).maskedEmail || '');
        setShowOtpSentModal(true);
      } else {
        setErrorModal(res.message || 'Failed to send OTP. Please check your ID.');
      }
    } catch (e: any) {
      setErrorModal(e.message || 'Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
      setLoadMsg('');
    }
  };

  const handleResendInModal = async () => {
    const uid = userId.trim();
    if (!uid || !resolvedRole || resendingModal) return;
    setResendingModal(true);
    try {
      const res = await sendOTPRequest(uid, resolvedRole);
      if (res.success) {
        setModalNotice('Code resent successfully!');
        setTimeout(() => setModalNotice(null), 3500);
      } else {
        setErrorModal(res.message || 'Could not resend code.');
      }
    } catch {
      setErrorModal('Could not resend code.');
    } finally {
      setResendingModal(false);
    }
  };

  const goToOTP = () => {
    setShowOtpSentModal(false);
    navigate('/verify-otp', {
      state: { userId: userId.trim(), role: resolvedRole, maskedEmail },
    });
  };

  const disabled = loading || !userId.trim();

  return (
    <>
      <AuthShell
        background="/auth-bg-login.jpg"
        headline="Secure access, beautifully simple."
        subline="Sign in to manage gate passes, approvals and campus access — all in one place."
      >
        <motion.div variants={container} initial="hidden" animate="show">


          <motion.h2 variants={item} style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: 26, fontWeight: 800, color: '#0F172A', marginBottom: 4, letterSpacing: '-0.4px' }}>Welcome Back</motion.h2>
          <motion.p variants={item} style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>Sign in with your institute credential.</motion.p>

          <motion.div variants={item} style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
              IDENTIFICATION
            </label>
            <motion.div
              animate={{
                borderColor: focused ? '#1E293B' : '#E2E8F0',
                boxShadow: focused ? '0 0 0 4px rgba(30,41,59,0.10)' : '0 0 0 0px rgba(30,41,59,0)',
              }}
              transition={{ duration: 0.18 }}
              style={{
                borderWidth: 1.5, borderStyle: 'solid', borderRadius: 16,
                background: '#F8FAFC', overflow: 'hidden',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Security ID / Staff ID / Roll No"
                value={userId}
                onChange={e => setUserId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
                autoCapitalize="characters"
                spellCheck={false}
                style={{
                  width: '100%', height: 56, padding: '0 18px',
                  background: 'transparent', border: 'none',
                  fontSize: 16, fontWeight: 700,
                  color: '#0F172A', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </motion.div>
          </motion.div>

          <motion.button
            variants={item}
            onClick={() => handleSendOTP()}
            disabled={disabled}
            whileHover={disabled ? undefined : { scale: 1.015 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'relative', overflow: 'hidden',
              width: '100%', height: 54,
              background: disabled
                ? '#94A3B8'
                : 'linear-gradient(120deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
              borderRadius: 16, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
              color: '#FFFFFF', fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 28, letterSpacing: '0.1em', textTransform: 'uppercase',
              boxShadow: disabled ? 'none' : '0 10px 24px rgba(15,23,42,0.30)',
            }}
          >
            {!disabled && (
              <motion.span
                aria-hidden
                initial={{ x: '-120%' }}
                animate={{ x: '120%' }}
                transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.2 }}
                style={{
                  position: 'absolute', top: 0, bottom: 0, width: '45%',
                  background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.28), transparent)',
                  transform: 'skewX(-18deg)',
                }}
              />
            )}
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {loading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />{loadMsg || 'Please wait...'}</>
              ) : (
                <>Continue <ArrowRight size={18} /></>
              )}
            </span>
          </motion.button>

          {/* Divider */}
          <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ margin: '0 16px', fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </motion.div>

          {/* QR scan */}
          <motion.button
            variants={item}
            onClick={() => navigate('/login-scan')}
            whileHover={{ y: -2, borderColor: '#CBD5E1', backgroundColor: '#F1F5F9' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', background: '#F8FAFC', borderRadius: 16,
              border: '1.5px solid #E2E8F0', cursor: 'pointer', boxSizing: 'border-box',
            }}
          >
            <div style={{
              width: 44, height: 44, background: '#FFFFFF', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flexShrink: 0,
            }}>
              <QrCode size={22} color="#1E293B" />
            </div>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Scan QR Code</span>
            <ChevronRight size={20} color="#CBD5E1" />
          </motion.button>
        </motion.div>
      </AuthShell>

      {/* OTP Sent Modal */}
      <AnimatePresence>
        {showOtpSentModal && (
          <motion.div
            onClick={() => setShowOtpSentModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              style={{
                background: '#FFFFFF', borderRadius: 32, padding: 24,
                width: '100%', maxWidth: 360,
                boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <motion.img
                  src="/logo.png"
                  alt="RIT Gate"
                  initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
                  style={{ width: 62, height: 62, borderRadius: 20, objectFit: 'cover', display: 'block' }}
                />
                <button
                  onClick={() => setShowOtpSentModal(false)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={18} color="#64748B" />
                </button>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: 24, fontWeight: 800, color: '#000000', marginBottom: 8 }}>OTP Sent</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 16 }}>
                A 6-digit code has been sent to <strong style={{ color: '#0F172A' }}>{maskedEmail || 'your email'}</strong>
              </p>

              {modalNotice && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#16A34A', marginBottom: 16 }}>
                  <CheckCircle2 size={16} />
                  <span>{modalNotice}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleResendInModal}
                  disabled={resendingModal}
                  style={{
                    flex: 1, height: 52, background: '#F1F5F9', border: '1.5px solid #E2E8F0',
                    borderRadius: 16, cursor: resendingModal ? 'not-allowed' : 'pointer',
                    color: '#0F172A', fontSize: 13, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: resendingModal ? 0.7 : 1, transition: 'all 0.2s ease',
                  }}
                >
                  <RefreshCw size={14} style={resendingModal ? { animation: 'spin 1s linear infinite' } : {}} />
                  {resendingModal ? 'Sending...' : 'Resend Code'}
                </button>

                <motion.button
                  onClick={goToOTP}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1.2, height: 52, background: 'linear-gradient(120deg, #0F172A, #334155)', borderRadius: 16,
                    border: 'none', cursor: 'pointer', color: '#FFFFFF',
                    fontSize: 13, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}
                >
                  Enter Code
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {errorModal && (
          <motion.div
            onClick={() => setErrorModal(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -5, 5, 0] }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26, x: { duration: 0.4, delay: 0.1 } }}
              style={{
                background: '#FFFFFF', borderRadius: 32, padding: 24,
                width: '100%', maxWidth: 360,
                boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{
                  width: 62, height: 62, borderRadius: 20, background: '#EF4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={30} color="#FFFFFF" />
                </div>
                <button
                  onClick={() => setErrorModal(null)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={18} color="#64748B" />
                </button>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: 24, fontWeight: 800, color: '#000000', marginBottom: 8 }}>Error</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>{errorModal}</p>
              <motion.button
                onClick={() => setErrorModal(null)}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', height: 56, background: 'linear-gradient(120deg, #0F172A, #334155)', borderRadius: 20,
                  border: 'none', cursor: 'pointer', color: '#FFFFFF',
                  fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}
              >
                Dismiss
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
