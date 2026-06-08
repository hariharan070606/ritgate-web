import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck as Shield, Fingerprint, QrCode, Zap, Loader2, RefreshCw, Mail, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OTP_CONFIG } from '../../config/api.config';
import type { UserRole } from '../../types';

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
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        setErrorModal(res.message || 'Invalid OTP code. Please try again.');
        setOtpDigits(Array(OTP_CONFIG.LENGTH).fill(''));
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setErrorModal('Verification failed due to a network error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await sendOTPRequest(userId, role);
      if (res.success) {
        setResendTimer(OTP_CONFIG.RESEND_DELAY_SECONDS);
        setOtpDigits(Array(OTP_CONFIG.LENGTH).fill(''));
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setErrorModal(res.message || 'Could not resend OTP.');
      }
    } catch {
      setErrorModal('Could not resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const activeIndex = otpDigits.findIndex(d => d === '');

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: '#1E293B', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={48} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#000000', letterSpacing: 2, margin: 0 }}>RIT GATE</h1>
          <p style={{ fontSize: 12, color: '#64748B', marginTop: 6, marginBottom: 16, letterSpacing: 1.3, textTransform: 'uppercase', fontWeight: 600 }}>
            Secure Access Control System
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { icon: <Fingerprint size={13} />, label: 'Biometric' },
              { icon: <QrCode size={13} />, label: 'Badge Scan' },
              { icon: <Zap size={13} />, label: 'Instant' },
            ].map((item, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                fontSize: 11, fontWeight: 700, color: '#1E293B',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {item.icon}{item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: 24,
          border: '1px solid #E2E8F0', padding: '24px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <ArrowLeft size={16} color="#64748B" />
            </button>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#000000', margin: 0 }}>Verify Identity</h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Enter the one-time password sent to your email.</p>
            </div>
          </div>

          {/* OTP boxes */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, textAlign: 'center' }}>
              Verification Code
            </label>
            <div style={{ display: 'flex', gap: 8 }} onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={ref => { otpRefs.current[i] = ref; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(e.target.value, i)}
                  onKeyDown={e => handleOtpKeyDown(e, i)}
                  style={{
                    flex: 1, minWidth: 0, height: 56,
                    background: digit ? '#F8FAFC' : '#F8FAFC',
                    border: digit
                      ? '2px solid #1E293B'
                      : i === activeIndex
                      ? '2px solid #3B82F6'
                      : '1.5px solid #E2E8F0',
                    borderRadius: 12,
                    fontSize: 22, fontWeight: 800, textAlign: 'center',
                    color: '#0F172A', outline: 'none',
                    boxShadow: i === activeIndex && !digit ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                    transition: 'border 0.15s, box-shadow 0.15s',
                    fontFamily: 'inherit',
                  }}
                />
              ))}
            </div>
          </div>

          {maskedEmail && (
            <p style={{ fontSize: 12, color: '#64748B', textAlign: 'center', margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Mail size={14} />
              Sent to <strong style={{ color: '#0F172A' }}>{maskedEmail}</strong>
            </p>
          )}

          {/* Resend / Change ID row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            {resendTimer > 0 ? (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                Resend in <strong style={{ color: '#0F172A' }}>{formatTimer(resendTimer)}</strong>
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 800, color: '#0F172A',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: 4, opacity: isResending ? 0.5 : 1,
                }}
              >
                <RefreshCw size={14} style={isResending ? { animation: 'spin 1s linear infinite' } : {}} />
                {isResending ? 'Sending...' : 'Resend OTP'}
              </button>
            )}
            <button
              onClick={() => navigate('/login')}
              style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Change ID
            </button>
          </div>

          {/* Verify button */}
          <button
            onClick={() => handleVerify()}
            disabled={otpDigits.join('').length !== OTP_CONFIG.LENGTH || isLoading}
            style={{
              width: '100%', height: 54,
              background: otpDigits.join('').length !== OTP_CONFIG.LENGTH || isLoading ? '#94A3B8' : '#1E293B',
              borderRadius: 16, border: 'none',
              cursor: otpDigits.join('').length !== OTP_CONFIG.LENGTH || isLoading ? 'not-allowed' : 'pointer',
              color: '#FFFFFF', fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              transition: 'background 0.2s',
            }}
          >
            {isLoading
              ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              : 'Verify & Login'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 20, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          Access Verification System
        </p>
      </div>

      {/* Error Modal */}
      {errorModal && (
        <div
          onClick={() => setErrorModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, background: 'rgba(15,23,42,0.5)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: 32, padding: 24,
              width: '100%', maxWidth: 360,
              boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
              animation: 'slideUp 0.25s ease',
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
            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#000000', marginBottom: 8 }}>Error</h3>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>{errorModal}</p>
            <button
              onClick={() => setErrorModal(null)}
              style={{
                width: '100%', height: 56, background: '#1E293B', borderRadius: 20,
                border: 'none', cursor: 'pointer', color: '#FFFFFF',
                fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
