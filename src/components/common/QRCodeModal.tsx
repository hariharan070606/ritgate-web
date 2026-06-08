import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Copy, CheckCircle, Share2, ShieldCheck, User, Calendar, ExternalLink, QrCode as QrIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string;
  manualCode?: string;
  title?: string;
  subtitle?: string;
  userName?: string;
  idNumber?: string;
  purpose?: string;
}

export default function QRCodeModal({ 
  isOpen, 
  onClose, 
  qrCode, 
  manualCode, 
  title = 'Access Pass',
  subtitle = 'Show this at the gate',
  userName = 'Authorized User',
  idNumber = '---',
  purpose = 'Campus Access'
}: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (manualCode) {
      navigator.clipboard.writeText(manualCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      // Create a high-res card
      canvas.width = 800;
      canvas.height = 1200;
      
      // Draw Gradient Background
      const gradient = ctx.createLinearGradient(0, 0, 0, 1200);
      gradient.addColorStop(0, '#1e40af');
      gradient.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 1200);

      // Draw Logo / Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px Inter, system-ui';
      ctx.fillText('RITGATE DIGITAL PASS', 60, 100);
      
      ctx.globalAlpha = 0.5;
      ctx.font = '700 24px Inter, system-ui';
      ctx.fillText('OFFICIAL CLEARANCE CREDENTIAL', 60, 140);
      ctx.globalAlpha = 1.0;

      // Draw White Card Area
      ctx.fillStyle = '#ffffff';
      ctx.roundRect?.(60, 200, 680, 800, 40); // Standard JS might not have roundRect in all envs, layout safely
      ctx.fillRect(60, 200, 680, 800); // Fallback

      // Draw QR Code
      ctx.drawImage(img, 150, 400, 500, 500);

      // Draw Personal Details
      ctx.fillStyle = '#1e293b';
      ctx.font = '800 32px Inter, system-ui';
      ctx.fillText(userName.toUpperCase(), 100, 300);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '700 20px Inter, system-ui';
      ctx.fillText(`ID: ${idNumber}`, 100, 340);
      ctx.fillText(`OBJ: ${purpose.toUpperCase()}`, 100, 370);

      // Draw Manual Code at Bottom
      if (manualCode) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(60, 1050, 680, 100);
        ctx.fillStyle = '#1e293b';
        ctx.font = '900 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(manualCode, 400, 1115);
      }

      // Download
      const link = document.createElement('a');
      link.download = `ritgate-pass-${idNumber}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="-m-6 flex flex-col items-center p-8 space-y-6">
        
        <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-700">
           <QrIcon className="w-10 h-10 text-slate-900 dark:text-white" />
        </div>

        <div className="text-center space-y-1">
           <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[#94A3B8]">{subtitle}</p>
        </div>

        {/* QR Code Container */}
        <div className="p-6 bg-white rounded-3xl shadow-xl border border-slate-100 relative group overflow-hidden">
           <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
           <AnimatePresence mode="wait">
             {qrCode ? (
               <motion.div 
                 key="qr-content"
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
               >
                 <QRCodeSVG
                    id="qr-code-svg"
                    value={qrCode}
                    size={200}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#0F172A"
                  />
               </motion.div>
             ) : (
               <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
               </div>
             )}
           </AnimatePresence>
        </div>

        {/* Manual Code Section */}
        {manualCode && (
           <div className="w-full space-y-2">
              <p className="text-[10px] text-slate-400 text-center uppercase font-black tracking-widest">Manual Code</p>
              <div onClick={handleCopy} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 cursor-pointer active:scale-95 transition-transform">
                 <div className="w-6" /> {/* spacer */}
                 <code className="text-xl font-black text-slate-900 dark:text-white tracking-[0.2em]">{manualCode}</code>
                 <div className={cn(
                   "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                   copied ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-[var(--color-primary)]"
                 )}>
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                 </div>
              </div>
           </div>
        )}

        <Button 
          fullWidth 
          size="lg"
          className="h-16 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest shadow-xl text-base"
          icon={<Download className="w-5 h-5" />} 
          onClick={handleExport}
        >
          Download Pass
        </Button>

        <div className="flex items-center gap-2 opacity-20">
           <ShieldCheck className="w-4 h-4" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em]">RITGATE VERIFIED</span>
        </div>
      </div>
    </Modal>
  );
}
