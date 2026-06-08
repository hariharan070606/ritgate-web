import { useState } from 'react';
import PurposeSelect from '../../components/common/PurposeSelect';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Send, Loader2, QrCode, Ban } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import QRCodeModal from '../../components/common/QRCodeModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { submitNTFGatePass, approveGatePassByHR, getGatePassQRCode } from '../../services/api.service';
import { useActionLock } from '../../context/ActionLockContext';
import { transitions } from '../../design-system/animations';
import { nowIST } from '../../utils/dateUtils';

/** Returns current hour in IST (UTC+5:30) */
const getISTHour = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 60 * 60 * 1000).getHours();
};

interface AdminNewPassProps {
  onBack?: () => void;
}

export default function AdminNewPass({ onBack }: AdminNewPassProps = {}) {
  const { getUserId, user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { withLock } = useActionLock();
  const adminCode = getUserId();
  const adminName = (user as any)?.staffName || (user as any)?.name || 'Admin';

  const passDisabled = getISTHour() >= 17;
  
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // QR state
  const [qrData, setQrData] = useState({ qrCode: '', manualCode: '' });
  const [showQR, setShowQR] = useState(false);

  const handleSubmit = () => {
    if (!purpose.trim() || !reason.trim()) {
      showError('Missing Info', 'Please provide both purpose and reason.');
      return;
    }
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    await withLock(async () => {
      try {
        // Step 1: Submit as NTF/Admin
        const submitRes = await submitNTFGatePass({
          staffCode: adminCode,
          purpose: purpose.trim(),
          reason: reason.trim(),
          requestDate: nowIST(),
        });
        if (!submitRes.success) {
          showError('Failed', submitRes.message || 'Submission failed.');
          return;
        }
        
        const requestId = (submitRes as any).requestId || (submitRes as any).id;
        if (!requestId) {
          showError('Partial Success', 'Gate pass submitted but ID missing.');
          return;
        }

        // Step 2: Auto-approve as HR (Admin has this privilege in mobile logic)
        const approveRes = await approveGatePassByHR(adminCode, Number(requestId));
        if (!approveRes.success) {
          showError('Submission Error', 'Pass submitted but auto-approval failed.');
          return;
        }

        // Step 3: Fetch QR
        const qrRes = await getGatePassQRCode(requestId, adminCode);
        if (qrRes.success) {
          setQrData({ qrCode: qrRes.qrCode || '', manualCode: qrRes.manualCode || '' });
          setShowQR(true);
          showSuccess('Success', 'Gate pass instantly generated!');
          setPurpose('');
          setReason('');
        } else {
          showError('QR Error', 'Pass approved but QR generation failed.');
        }
      } catch (e: any) {
        showError('Error', e?.message || 'An error occurred.');
      } finally {
        setSubmitting(false);
      }
    }, 'Generating Instant Pass...');
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10 text-left">
      {/* Header */}
      <div className="text-left px-1">
        <div className="flex items-center gap-2 text-[var(--color-primary)] dark:text-blue-400 mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold tracking-widest uppercase">Admin Authorization</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Instant Gate Pass</h2>
        <p className="text-xs text-slate-400 mt-1">Generated passes are auto-approved for Administrative Officers</p>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-blue-50 dark:bg-indigo-950/20 border border-blue-100 dark:border-indigo-900/30 rounded-2xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-900 flex items-center justify-center shrink-0 shadow-sm border border-blue-100 dark:border-[var(--color-primary)]">
          <QrCode className="w-4 h-4 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--color-primary)] dark:text-indigo-300">Instant Issuance</p>
          <p className="text-[11px] text-[var(--color-primary)]/70 dark:text-blue-400/70 mt-0.5 leading-relaxed">Your gate pass will be approved automatically and a QR code will be generated immediately upon submission.</p>
        </div>
      </div>

      {/* Time restriction banner */}
      {passDisabled && (
        <motion.div initial={transitions.page.initial} animate={transitions.page.animate}>
          <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
            <Ban className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Not Available</p>
              <p className="text-xs text-rose-600 dark:text-rose-400/80 font-medium leading-relaxed mt-0.5">
                Gate pass generation is disabled after 5:00 PM.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* User Info */}
      <motion.div initial={transitions.page.initial} animate={transitions.page.animate}>
        <Card className="bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-black text-sm">
              {adminName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{adminName}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{adminCode} • ADMIN OFFICER</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Form */}
      <motion.div initial={transitions.page.initial} animate={transitions.page.animate} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Purpose *</label>
          <PurposeSelect value={purpose} onChange={setPurpose} variant="compact" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Reason *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe the reason..."
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300 outline-none resize-none"
          />
        </div>
      </motion.div>

      {/* Submit */}
      <Button
        fullWidth
        size="lg"
        onClick={handleSubmit}
        disabled={submitting || !purpose.trim() || !reason.trim() || passDisabled}
        className="h-14 rounded-2xl font-black uppercase tracking-widest gap-2 bg-[var(--color-primary)] hover:bg-blue-900"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <QrCode className="w-5 h-5" />
            Generate Pass
          </>
        )}
      </Button>

      {/* Confirmation */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Generate Gate Pass" size="sm">
        <div className="space-y-5 pt-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Submit and generate an <strong>instant</strong> gate pass? It will be auto-approved.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setShowConfirm(false)} variant="secondary" className="flex-1 font-bold">CANCEL</Button>
            <Button onClick={doSubmit} className="flex-[2] font-bold">GENERATE</Button>
          </div>
        </div>
      </Modal>

      {/* QR Modal */}
      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        qrCode={qrData.qrCode}
        manualCode={qrData.manualCode}
        userName={adminName}
        idNumber={adminCode}
        purpose={purpose}
        title="ADMIN GATE PASS"
      />
    </div>
  );
}
