import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AuthShellProps {
  /** Background image shown behind the form (full-bleed on phone, left panel on desktop/tablet). */
  background: string;
  /** Large headline shown over the photo panel (desktop/tablet only). */
  headline?: string;
  /** Sub copy under the headline. */
  subline?: string;
  /** The form card content. */
  children: ReactNode;
  /** Optional extra content placed between branding and the form card. */
  headerExtra?: ReactNode;
  /** Show top-left corner back button */
  showBackButton?: boolean;
  /** On click callback for back button */
  onBack?: () => void;
}

/**
 * Responsive auth layout — clean, centered card layout.
 * Branding is placed above the card.
 */
export default function AuthShell({
  background: _background,
  headline: _headline,
  subline: _subline,
  children,
  headerExtra,
  showBackButton,
  onBack,
}: AuthShellProps) {
  const navigate = useNavigate();

  const handleDefaultBack = () => {
    if (window.history.state && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="auth-shell relative">
      {/* Top Left Corner Back Button */}
      {showBackButton && (
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onBack || handleDefaultBack}
          className="fixed top-5 left-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-extrabold uppercase tracking-wider hidden sm:inline">Back</span>
        </motion.button>
      )}

      {/* Background Glow Accents for Desktop & Tablet */}
      {/* Background Glow Accents for Desktop & Tablet */}
      <div className="auth-shell__bg-glow auth-shell__bg-glow--1" aria-hidden />
      <div className="auth-shell__bg-glow auth-shell__bg-glow--2" aria-hidden />

      {/* Container for Centered Layout */}
      <div className="auth-shell__container">

        {/* Branding (Clean Centered Logo & Title) */}
        <motion.div
          className="auth-shell__brand"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <div className="auth-shell__logo-wrap">
            <img src="/logo.png" alt="RIT Gate Logo" className="auth-shell__logo" />
          </div>
          <div className="auth-shell__brand-text">
            <h1 className="auth-shell__brand-name">RIT GATE</h1>
          </div>
        </motion.div>

        {/* Optional Header Extra (If present) */}
        {headerExtra && (
          <div className="auth-shell__header-extra">
            {headerExtra}
          </div>
        )}

        {/* Form Card */}
        <motion.div
          className="auth-shell__card"
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
        >
          {children}
        </motion.div>
      </div>

      <style>{`
        .auth-shell {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%);
          color: #0F172A;
          overflow-x: hidden;
          overflow-y: auto;
          width: 100%;
          padding: 48px 20px;
          box-sizing: border-box;
        }

        .dark .auth-shell {
          background: linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #1E293B 100%);
          color: #F8FAFC;
        }

        /* Ambient Glows */
        .auth-shell__bg-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.45;
        }
        .auth-shell__bg-glow--1 {
          width: 320px;
          height: 320px;
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(255, 255, 255, 0) 70%);
        }
        .auth-shell__bg-glow--2 {
          width: 400px;
          height: 400px;
          bottom: 5%;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(255, 255, 255, 0) 70%);
        }

        .auth-shell__container {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .auth-shell__header-extra {
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .auth-shell__back {
          position: absolute;
          left: 0;
          top: -44px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
          transition: all 0.2s ease;
        }
        .auth-shell__back:hover {
          background: #FFFFFF;
          color: #0F172A;
          transform: translateX(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
        }
        .dark .auth-shell__back {
          background: rgba(30, 41, 59, 0.7);
          border-color: rgba(255, 255, 255, 0.1);
          color: #94A3B8;
        }
        .dark .auth-shell__back:hover {
          background: #1E293B;
          color: #FFFFFF;
        }

        /* Branding: Enlarged Logo & Centered Title */
        .auth-shell__brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 28px;
          text-align: center;
          width: 100%;
        }

        .auth-shell__logo-wrap {
          position: relative;
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-shell__logo {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.15), 0 4px 10px rgba(0,0,0,0.06);
          position: relative;
          z-index: 1;
          background: #FFFFFF;
          padding: 3px;
          box-sizing: border-box;
          border: 1px solid rgba(226, 232, 240, 0.9);
          transition: transform 0.3s ease;
        }
        .auth-shell__logo-wrap:hover .auth-shell__logo {
          transform: scale(1.04);
        }

        .auth-shell__logo-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid rgba(37, 99, 235, 0.35);
          animation: authPulseRing 3s ease-out infinite;
        }
        .dark .auth-shell__logo-ring {
          border-color: rgba(96, 165, 250, 0.4);
        }
        @keyframes authPulseRing {
          0%   { transform: scale(0.92); opacity: 0.8; }
          70%  { transform: scale(1.16); opacity: 0; }
          100% { transform: scale(1.16); opacity: 0; }
        }

        .auth-shell__brand-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .auth-shell__brand-name {
          margin: 0;
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #0F172A;
          line-height: 1.1;
          text-transform: uppercase;
        }
        .dark .auth-shell__brand-name {
          color: #FFFFFF;
        }

        /* Form Card */
        .auth-shell__card {
          width: 100%;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 28px;
          padding: 36px 32px;
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.07), 0 4px 12px rgba(0, 0, 0, 0.02);
          box-sizing: border-box;
          transition: all 0.3s ease;
        }
        .dark .auth-shell__card {
          background: rgba(15, 23, 42, 0.88);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 56px rgba(0, 0, 0, 0.45);
        }

        /* Breakpoints for Tablet & Phone Views */
        @media (min-width: 768px) and (max-width: 1024px) {
          /* Tablet View Specifics */
          .auth-shell {
            padding: 40px 24px;
          }
          .auth-shell__container {
            max-width: 450px;
          }
          .auth-shell__logo-wrap, .auth-shell__logo {
            width: 100px;
            height: 100px;
          }
          .auth-shell__brand-name {
            font-size: 30px;
          }
          .auth-shell__card {
            padding: 36px 30px;
          }
        }

        @media (max-width: 767px) {
          /* Mobile Phone View Specifics */
          .auth-shell {
            padding: 24px 16px;
            align-items: flex-start;
          }
          .auth-shell__container {
            padding-top: 36px;
            max-width: 100%;
          }
          .auth-shell__back {
            top: 0px;
            left: 0px;
            width: 38px;
            height: 38px;
          }
          .auth-shell__brand {
            gap: 14px;
            margin-bottom: 24px;
          }
          .auth-shell__logo-wrap, .auth-shell__logo {
            width: 88px;
            height: 88px;
          }
          .auth-shell__brand-name {
            font-size: 26px;
            letter-spacing: 0.08em;
          }
          .auth-shell__card {
            padding: 28px 22px;
            border-radius: 24px;
          }
        }
      `}</style>
    </div>
  );
}

