import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface MotionLoaderProps {
  label?: string;
  className?: string;
  compact?: boolean;
}

/* Flight path — shared by the dotted route, the plane and the trailing
   particles so everything rides exactly the same curve. Coordinates are in
   the SAME pixel space as the box below (no scaling), so 1 unit === 1px. */
const TRAIL_PATH = 'M 24 118 C 96 118, 124 52, 200 48 S 300 30, 318 20';
const BOX_W = 340;
const BOX_H = 150;

/* Shared flight timing — the plane and every trailing particle reuse this so
   the comet trail stays locked to the plane. */
const FLIGHT_DURATION = 3;
const FLIGHT_EASE = [0.42, 0, 0.2, 1] as const; // accelerate out, settle in — momentum

function PaperPlane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M45 5 L3 22.5 L22 28 Z" fill="#0F172A" className="dark:fill-slate-100" />
      <path d="M45 5 L22 28 L27 43 Z" fill="#1E293B" className="dark:fill-slate-300" />
      <path d="M22 28 L15.5 40.5 L25 33.5 Z" fill="#334155" className="dark:fill-slate-400" />
    </svg>
  );
}

/**
 * Professional motion-graphic loader — a small plane banking along a dotted
 * flight route with a fading comet trail. The plane follows the route exactly
 * via a CSS offset-path and rotates to the path tangent (offset-rotate) for
 * believable banking physics. Replaces static skeletons across all views.
 */
export default function MotionLoader({ label = 'Loading', className, compact = false }: MotionLoaderProps) {
  // Trailing particles: each lags the plane a little more and fades smaller.
  const particles = [
    { delay: 0.05, size: 6, opacity: 0.55 },
    { delay: 0.11, size: 5, opacity: 0.4 },
    { delay: 0.18, size: 4, opacity: 0.28 },
    { delay: 0.26, size: 3, opacity: 0.18 },
  ];

  return (
    <div
      className={cn(
        'motion-loader flex w-full flex-col items-center justify-center gap-7',
        compact ? 'py-12' : 'min-h-[55vh] py-16',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn('relative max-w-full shrink-0', compact && 'origin-center scale-[0.7]')}
        style={{ width: BOX_W, height: BOX_H }}
      >
        {/* Dotted flight route (static guide) */}
        <svg
          viewBox={`0 0 ${BOX_W} ${BOX_H}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d={TRAIL_PATH}
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="0.5 9"
          />
          {/* Origin / destination markers */}
          <circle cx="24" cy="118" r="3" className="fill-slate-300 dark:fill-slate-700" />
          <circle cx="318" cy="20" r="3.5" className="fill-slate-900/80 dark:fill-white/80" />
        </svg>

        {/* Comet trail — particles riding the same path, lagging the plane */}
        {particles.map((p, i) => (
          <motion.span
            key={i}
            className="absolute left-0 top-0 rounded-full bg-slate-900 dark:bg-white"
            style={{
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              offsetPath: `path('${TRAIL_PATH}')`,
              offsetRotate: '0deg',
            }}
            initial={{ offsetDistance: '0%', opacity: 0 }}
            animate={{ offsetDistance: ['0%', '100%'], opacity: [0, p.opacity, p.opacity, 0] }}
            transition={{
              repeat: Infinity,
              duration: FLIGHT_DURATION,
              ease: FLIGHT_EASE,
              times: [0, 0.14, 0.86, 1],
              delay: p.delay,
            }}
          />
        ))}

        {/* Plane — rides the route and banks to the path tangent */}
        <motion.div
          className="absolute left-0 top-0"
          style={{ offsetPath: `path('${TRAIL_PATH}')`, offsetRotate: 'auto 47deg' }}
          initial={{ offsetDistance: '0%', opacity: 0 }}
          animate={{ offsetDistance: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
          transition={{ repeat: Infinity, duration: FLIGHT_DURATION, ease: FLIGHT_EASE, times: [0, 0.12, 0.88, 1] }}
        >
          {/* subtle flutter for life, independent of the banking rotation */}
          <motion.div
            animate={{ y: [0, -1.5, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          >
            <PaperPlane className="h-12 w-12 drop-shadow-[0_6px_12px_rgba(15,23,42,0.35)] dark:drop-shadow-[0_6px_12px_rgba(255,255,255,0.2)]" />
          </motion.div>
        </motion.div>
      </div>

      <motion.span
        className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
      >
        {label}
      </motion.span>
    </div>
  );
}
