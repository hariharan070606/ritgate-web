import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimationControls, type Variants } from 'framer-motion';
import { ArrowLeft, Loader2, RefreshCw, Mail, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OTP_CONFIG } from '../../config/api.config';
import type { UserRole } from '../../types';
import AuthShell from '../../components/auth/AuthShell';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.32 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function OTPVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, role, maskedEmail } = (location.state as { userId: string; role: UserRole; maskedEmail?: string }) || {};
  const { verifyOTPRequest, sendOTPRequest } = useAuth();

  const [otpDigits, setOtpDigits] = useState(Array(OTP_CONFIG.LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(OTP_CONFIG.RESEND_DELAY_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const shakeControls = useAnimationControls();

  const triggerShake = () =>
    shakeControls.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });

  useEffect(() => {
    if (!userId || !role) navigate('/login', { replace: true });
  }, [userId, role, navigate]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  useEffect(() => {
    const t = setTimeout(() => otpRefs.current[0]?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (digit && index < OTP_CONFIG.LENGTH - 1) otpRefs.current[index + 1]?.focus();
    if (newDigits.every(d => d !== '') && newDigits.join('').length === OTP_CONFIG.LENGTH) {
      handleVerify(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') handleVerify();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_CONFIG.LENGTH);
    if (text.length) {
      const digits = text.split('').concat(Array(OTP_CONFIG.LENGTH - text.length).fill(''));
      setOtpDigits(digits.slice(0, OTP_CONFIG.LENGTH));
      otpRefs.current[Math.min(text.length, OTP_CONFIG.LENGTH - 1)]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code ?? otpDigits.join('');
    if (otpCode.length !== OTP_CONFIG.LENGTH) return;
    setIsLoading(true);
    try {
      const res = await verifyOTPRequest(userId, otpCode, role);
      if (res.success) {
        navigate('/dashboard', { replace: true });
      } else {
        triggerShake();
        setErrorModal(res.message || 'Invalid OTP code. Please try again.');
        setOtpDigits(Array(OTP_CONFIG.LENGTH).fill(''));
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      triggerShake();
      setErrorModal('Verification failed due to a network error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      const res = await sendOTPRequest(userId, role);
      if (res.success) {
        setResendTimer(OTP_CONFIG.RESEND_DELAY_SECONDS);
        setOtpDigits(Array(OTP_CONFIG.LENGTH).fill(''));
        setSuccessToast('New verification code sent successfully!');
        setTimeout(() => setSuccessToast(null), 4000);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setErrorModal(res.message || 'Could not resend code.');
      }
    } catch {
      setErrorModal('Could not resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const activeIndex = otpDigits.findIndex(d => d === '');
  const complete = otpDigits.join('').length === OTP_CONFIG.LENGTH;
  const verifyDisabled = !complete || isLoading;

  return (
    <>
      <AuthShell
        background="/auth-bg-otp.jpg"
        headline="One last step to verify it's you."
        subline="We've sent a one-time code to your registered institute email. Enter it to continue."
        showBackButton={true}
        onBack={() => navigate('/login')}
      >
        <motion.div variants={container} initial="hidden" animate="show">
          {/* Success Toast Banner */}
          <AnimatePresence>
            {successToast && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0',
                  borderRadius: 14, color: '#166534', fontSize: 13, fontWeight: 700,
                  marginBottom: 16, boxShadow: '0 4px 12px rgba(22,101,52,0.08)'
                }}
              >
                <CheckCircle2 size={18} color="#16A34A" />
                <span>{successToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header row */}
          <motion.div variants={item} className="text-center mb-6">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              Verify Identity
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
              Enter the 6-digit verification code sent to your email.
            </p>
          </motion.div>

          {/* OTP boxes */}
          <motion.div variants={item} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, textAlign: 'center' }}>
              VERIFICATION CODE
            </label>
            <motion.div animate={shakeControls} style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => {
                const isActive = i === activeIndex;
                return (
                  <motion.div
                    key={i}
                    animate={digit ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ flex: 1, minWidth: 0, maxWidth: 52 }}
                  >
                    <input
                      ref={ref => { otpRefs.current[i] = ref; }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(e.target.value, i)}
                      onKeyDown={e => handleOtpKeyDown(e, i)}
                      style={{
                        width: '100%', height: 56,
                        background: digit ? '#FFFFFF' : '#F8FAFC',
                        border: digit
                          ? '2px solid #2563EB'
                          : isActive
                          ? '2px solid #3B82F6'
                          : '1.5px solid #E2E8F0',
                        borderRadius: 14,
                        fontSize: 22, fontWeight: 800, textAlign: 'center',
                        color: '#0F172A', outline: 'none', boxSizing: 'border-box',
                        boxShadow: isActive ? '0 0 0 4px rgba(59,130,246,0.18)' : digit ? '0 2px 8px rgba(37,99,235,0.1)' : 'none',
                        transition: 'all 0.18s ease',
                        fontFamily: 'inherit',
                      }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          {maskedEmail && (
            <motion.div variants={item} style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', background: '#F1F5F9', border: '1px solid #E2E8F0',
                borderRadius: 999, fontSize: 12, color: '#64748B', fontWeight: 500,
              }}>
                <Mail size={14} color="#0F172A" />
                <span>Sent to <strong style={{ color: '#0F172A', fontWeight: 700 }}>{maskedEmail}</strong></span>
              </div>
            </motion.div>
          )}

          {/* Prominent Always-Visible Resend Code Bar */}
          <motion.div
            variants={item}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: '#F8FAFC', border: '1.5px solid #E2E8F0',
              borderRadius: 16, marginBottom: 24, gap: 12, flexWrap: 'wrap'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
              Didn't receive code?
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 800, color: '#2563EB',
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                  borderRadius: 10, padding: '7px 14px', cursor: 'pointer',
                  opacity: isResending ? 0.7 : 1, transition: 'all 0.2s ease',
                }}
              >
                <RefreshCw size={14} style={isResending ? { animation: 'spin 1s linear infinite' } : {}} />
                {isResending ? 'Sending...' : resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  fontSize: 13, fontWeight: 700, color: '#64748B',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px'
                }}
              >
                Change ID
              </button>
            </div>
          </motion.div>

          {/* Verify button */}
          <motion.button
            variants={item}
            onClick={() => handleVerify()}
            disabled={verifyDisabled}
            whileHover={verifyDisabled ? undefined : { scale: 1.015 }}
            whileTap={verifyDisabled ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'relative', overflow: 'hidden',
              width: '100%', height: 54,
              background: verifyDisabled
                ? '#94A3B8'
                : 'linear-gradient(120deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
              borderRadius: 16, border: 'none',
              cursor: verifyDisabled ? 'not-allowed' : 'pointer',
              color: '#FFFFFF', fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              boxShadow: verifyDisabled ? 'none' : '0 10px 24px rgba(15,23,42,0.30)',
            }}
          >
            {!verifyDisabled && (
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
              {isLoading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Verifying...</>
              ) : (
                <>Verify & Login</>
              )}
            </span>
          </motion.button>
        </motion.div>
      </AuthShell>

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
