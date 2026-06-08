import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Fingerprint,
  QrCode,
  ChevronRight,
  ShieldCheck as Shield,
  Loader2,
  Zap,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { detectRole } from '../../services/api.service';
import type { UserRole } from '../../types';


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

  const goToOTP = () => {
    setShowOtpSentModal(false);
    navigate('/verify-otp', {
      state: { userId: userId.trim(), role: resolvedRole, maskedEmail },
    });
  };

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
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#000000', marginBottom: 4 }}>Welcome Back</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>Sign in with your institute credential.</p>

<div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
              IDENTIFICATION
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Security ID / Staff ID / Roll No"
              value={userId}
              onChange={e => setUserId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
              autoFocus
              autoCapitalize="characters"
              spellCheck={false}
              style={{
                width: '100%', height: 56, padding: '0 18px',
                background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                borderRadius: 16, fontSize: 16, fontWeight: 700,
                color: '#0F172A', outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            onClick={() => handleSendOTP()}
            disabled={loading || !userId.trim()}
            style={{
              width: '100%', height: 54, background: loading || !userId.trim() ? '#94A3B8' : '#1E293B',
              borderRadius: 16, border: 'none', cursor: loading || !userId.trim() ? 'not-allowed' : 'pointer',
              color: '#FFFFFF', fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 28, letterSpacing: '0.1em', textTransform: 'uppercase',
              transition: 'background 0.2s',
            }}
          >
            {loading ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />{loadMsg || 'Please wait...'}</>
            ) : (
              <>Continue <ArrowRight size={18} /></>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ margin: '0 16px', fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          {/* QR scan */}
          <button
            onClick={() => navigate('/login-scan')}
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
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 20, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          Access Verification System
        </p>
      </div>

      {/* OTP Sent Modal */}
      {showOtpSentModal && (
        <div
          onClick={() => setShowOtpSentModal(false)}
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
                width: 62, height: 62, borderRadius: 20, background: '#1E293B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={30} color="#FFFFFF" />
              </div>
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
            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#000000', marginBottom: 8 }}>OTP Sent</h3>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
              A 6-digit code has been sent to <strong style={{ color: '#0F172A' }}>{maskedEmail || 'your email'}</strong>
            </p>
            <button
              onClick={goToOTP}
              style={{
                width: '100%', height: 56, background: '#1E293B', borderRadius: 20,
                border: 'none', cursor: 'pointer', color: '#FFFFFF',
                fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              Enter Code
            </button>
          </div>
        </div>
      )}

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
