import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, User as UserIcon, QrCode as QrIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import RequestTimeline from './RequestTimeline';
import { formatDate } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import Badge from '../ui/Badge';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  student: any;
  showQR?: boolean;
  qrCode?: string | null;
  manualCode?: string | null;
}

export default function RequestDetailsModal({
  isOpen,
  onClose,
  request,
  student,
  showQR = false,
  qrCode,
  manualCode,
}: RequestDetailsModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!request) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'emerald';
      case 'REJECTED': return 'red';
      default: return 'amber';
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-[110] backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[32px] z-[120] max-h-[92vh] overflow-y-auto shadow-2xl pb-safe"
            >
              {/* Handle */}
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

              {/* Header */}
              <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 z-10">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Request Details</h2>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 active:scale-90 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 pt-8 space-y-8">
                {/* Status Section */}
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[13px]">Current Status</span>
                  <Badge variant={getStatusVariant(request.status)} className="px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
                    {request.status || 'PENDING'}
                  </Badge>
                </div>

                {/* Student Information */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Information</h3>
                    {request.requestType === 'VISITOR' && (
                      <div className="bg-blue-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg flex items-center gap-1.5 border border-blue-100 dark:border-[var(--color-primary)]">
                        <UserIcon className="w-3 h-3 text-[var(--color-primary)]" />
                        <span className="text-[10px] font-black text-[var(--color-primary)] tracking-wider">VISITOR</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <InfoRow label="Reg No" value={student?.regNo || 'N/A'} />
                    <InfoRow label="Name" value={`${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'N/A'} />
                    <InfoRow label="Department" value={student?.department || 'N/A'} />
                  </div>
                </div>

                {/* Pass Details */}
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Pass Details</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Purpose" value={request.purpose || request.reason || 'N/A'} />
                    <InfoRow label="Reason" value={request.reason || request.purpose || 'N/A'} />
                    <InfoRow label="Requested On" value={formatDate(request.requestDate)} />
                    {(request.exitDateTime || (request.requestType === 'VISITOR' && request.visitDate)) && (
                      <InfoRow 
                        label={request.requestType === 'VISITOR' ? 'Entry Schedule' : 'Exit Schedule'} 
                        value={formatDate(request.requestType === 'VISITOR' ? (request.visitDate || request.requestDate) : (request.exitDateTime || request.requestDate))} 
                      />
                    )}
                  </div>
                </div>

                {/* Attachment */}
                {!showQR && request.attachmentUri && (
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Attachment</h3>
                    <div 
                      className="relative bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => setIsFullScreen(true)}
                    >
                      <img 
                        src={request.attachmentUri} 
                        alt="Attachment" 
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <div className="absolute bottom-6 right-6 bg-white/90 dark:bg-slate-900/90 p-2 rounded-xl shadow-lg">
                        <Maximize2 className="w-5 h-5 text-slate-600 dark:text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Process Timeline</h3>
                  <div className="px-2">
                    <RequestTimeline request={request} />
                  </div>
                </div>

                {/* QR Code Section */}
                {showQR && request.status === 'APPROVED' && qrCode && (
                  <div className="flex flex-col items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight self-start">Gate Pass QR</h3>
                    
                    <div className="relative group">
                      <div className="absolute -inset-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-[40px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative p-6 bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-50 items-center justify-center flex">
                        <QRCodeSVG
                          value={qrCode}
                          size={180}
                          level="H"
                          fgColor="#0F172A"
                          bgColor="#FFFFFF"
                          includeMargin={false}
                        />
                      </div>
                    </div>

                    {manualCode && (
                      <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Entry Code</span>
                        <code className="text-2xl font-black text-slate-900 dark:text-white tracking-[0.3em]">{manualCode}</code>
                      </div>
                    )}

                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 text-center px-8 uppercase tracking-wide leading-relaxed">
                      Scan this QR code at the Main Gate Exit terminal
                    </p>
                  </div>
                )}

                <div className="h-10" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setIsFullScreen(false)}
          >
            <button className="absolute top-10 right-6 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform">
              <X className="w-6 h-6" />
            </button>
            <img 
              src={request?.attachmentUri} 
              alt="Attachment Full Design" 
              className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0 grow">
      <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">{label}</span>
      <span className="text-sm font-extrabold text-slate-900 dark:text-white max-w-[65%] text-right leading-snug">{value}</span>
    </div>
  );
}
