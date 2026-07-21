import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RITLogo from './RITLogo';

// Background floating particle nodes
const particles = Array.from({ length: 14 }).map((_, i) => ({
  id: i,
  size: Math.random() * 4 + 2,
  left: `${Math.random() * 90 + 5}%`,
  duration: Math.random() * 5 + 6,
  delay: Math.random() * 2,
}));

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(() => {
    return !sessionStorage.getItem('ritgate_splash_shown');
  });

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('ritgate_splash_shown', 'true');
    }, 3200);
    return () => clearTimeout(timer);
  }, [isVisible]);

  const ritLetters = ['R', 'I', 'T'];
  const gateLetters = ['G', 'A', 'T', 'E'];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(10px)' }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#F7F9FF] overflow-hidden select-none"
        >
          {/* Ambient Gradient Mesh & Orbs */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                x: [0, 20, 0],
                y: [0, -15, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-[15%] -right-[10%] w-[65vw] h-[65vw] max-w-[700px] max-h-[700px] bg-gradient-to-br from-blue-300/30 via-indigo-200/20 to-transparent rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                x: [0, -25, 0],
                y: [0, 20, 0],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-[15%] -left-[10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] bg-gradient-to-tr from-blue-400/20 via-sky-200/20 to-transparent rounded-full blur-3xl"
            />
            <div className="absolute inset-0 bg-[radial-gradient(#2563eb_0.8px,transparent_0.8px)] [background-size:24px_24px] opacity-[0.04]" />
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ y: '105vh', opacity: 0 }}
                animate={{
                  y: '-10vh',
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1.2, 0.8],
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: 'linear',
                }}
                style={{
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                }}
                className="absolute rounded-full bg-blue-500/40 shadow-[0_0_8px_rgba(37,99,235,0.6)]"
              />
            ))}
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center px-4">
            {/* Clean Logo Container */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative mb-8"
            >
              {/* Breathing Micro-Float */}
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <RITLogo size={160} glow className="shadow-2xl" />
              </motion.div>
            </motion.div>

            {/* Premium Glass Card */}
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden bg-white/90 backdrop-blur-2xl border border-white/80 px-12 py-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(37,99,235,0.12)] flex flex-col items-center text-center max-w-sm w-full"
            >
              {/* Metallic Shimmer Sweep */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ delay: 0.8, duration: 1.2, ease: 'easeInOut' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/50 to-transparent skew-x-[-25deg] pointer-events-none"
              />

              {/* Staggered Animated Wordmark */}
              <div className="flex flex-col items-center gap-1">
                {/* RIT Title */}
                <div className="flex gap-2 justify-center">
                  {ritLetters.map((char, index) => (
                    <motion.span
                      key={`rit-${index}`}
                      initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{
                        delay: 0.4 + index * 0.08,
                        duration: 0.5,
                        type: 'spring',
                        stiffness: 180,
                        damping: 14,
                      }}
                      className="text-5xl sm:text-6xl font-extrabold text-[#1A3B71] tracking-tight"
                    >
                      {char}
                    </motion.span>
                  ))}
                </div>

                {/* GATE Title with Electric Blue Gradient */}
                <div className="flex gap-2 justify-center">
                  {gateLetters.map((char, index) => (
                    <motion.span
                      key={`gate-${index}`}
                      initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{
                        delay: 0.65 + index * 0.08,
                        duration: 0.5,
                        type: 'spring',
                        stiffness: 180,
                        damping: 14,
                      }}
                      className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent tracking-tight drop-shadow-sm"
                    >
                      {char}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Tagline */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.6 }}
                className="mt-3 text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-slate-400 uppercase"
              >
                Campus Gateway System
              </motion.div>
            </motion.div>
          </div>

          {/* Animated Wave Dots */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="absolute bottom-16 flex items-center gap-2.5 z-10"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                  backgroundColor: ['#93C5FD', '#2563EB', '#93C5FD'],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.25,
                  ease: 'easeInOut',
                }}
                className="w-2.5 h-2.5 rounded-full shadow-sm"
              />
            ))}
          </motion.div>

          {/* Bottom Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100/60 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3.2, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 shadow-[0_0_10px_rgba(37,99,235,0.8)]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
