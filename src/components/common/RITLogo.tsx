import LogoImg from '../../assets/logo.png';
import { cn } from '../../utils/cn';

interface RITLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'color' | 'white';
  glow?: boolean;
}

export default function RITLogo({ className, size = 100, variant = 'color', glow = false }: RITLogoProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Soft ambient glow without wireframe rings */}
      {glow && (
        <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />
      )}
      
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center rounded-full overflow-hidden bg-white shadow-xl",
          glow ? "border-[6px] border-blue-100" : "border-2 border-white ring-1 ring-slate-200/70",
          className
        )}
      >
        <img
          src={LogoImg}
          alt="RIT Logo"
          className={cn(
            "h-full w-full scale-[1.35] object-cover object-center",
            variant === 'white' && "brightness-0 invert opacity-90"
          )}
        />
      </div>
    </div>
  );
}
