import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, QrCode as QrIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import type { Student } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';

export default function StudentQRCodes() {
  usePageTitle('QR Codes');
  const navigate = useNavigate();
  const { user: rawUser } = useAuth();
  const user = rawUser as Student;

  const studentName = `${user?.firstName} ${user?.lastName || ''}`.trim();

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-[72px] flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[16px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
            My QR Codes
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      <main className="desktop-page px-5 pt-6 pb-28 lg:px-0 lg:pt-0 lg:pb-12">
        <DesktopPageHeader
          title="My QR Codes"
          subtitle="Use your student ID QR for campus entry and scanner verification."
          eyebrow="Student Identity"
        />
        <div className="max-w-md mx-auto space-y-6 lg:max-w-none lg:grid lg:grid-cols-[minmax(340px,440px)_1fr] lg:items-start lg:gap-6 lg:space-y-0">
          {/* Main QR Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-[20px] font-black text-slate-900 dark:text-white leading-tight">Student ID QR</h2>
                <p className="text-[14px] font-bold text-slate-400 mt-1">Use this for campus entry</p>
              </div>
              <div className="px-3 py-1.5 bg-blue-50 dark:bg-indigo-900/20 border border-blue-100 dark:border-indigo-900/30 rounded-xl">
                 <span className="text-[11px] font-black text-[var(--color-primary)] dark:text-blue-400 uppercase tracking-widest">STUDENT_ID</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[28px] border-2 border-slate-50 flex items-center justify-center mb-8 shadow-inner">
               <QRCodeSVG 
                 value={user?.regNo || 'N/A'}
                 size={220}
                 level="H"
                 includeMargin={false}
                 className="dark:filter-none"
               />
            </div>

            <div className="space-y-5 pt-6 border-t border-slate-50 dark:border-slate-800">
               <div>
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student Name</label>
                 <p className="text-[16px] font-extrabold text-slate-900 dark:text-white">{studentName}</p>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reg Number</label>
                   <p className="text-[15px] font-bold text-slate-900 dark:text-white">{user?.regNo}</p>
                 </div>
                 <div>
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Department</label>
                   <p className="text-[15px] font-bold text-slate-900 dark:text-white">{user?.department}</p>
                 </div>
               </div>
            </div>
          </motion.div>

          {/* Additional Help Info */}
          <div className="bg-blue-50 dark:bg-indigo-900/10 rounded-[24px] p-5 border border-blue-100 dark:border-indigo-900/20 flex items-start gap-4">
            <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100 dark:shadow-none">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[14px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight mb-1">Scanner Presence</h4>
              <p className="text-[12px] font-bold text-[var(--color-primary)]/60 dark:text-blue-400/50 leading-relaxed">
                Flash this code at the gate scanner for automatic attendance and logging.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
