import { useState } from 'react';
import PurposeSelect from '../../components/common/PurposeSelect';
import { motion } from 'framer-motion';
import { QrCode, ShieldCheck, FileText, Info, Loader2, Ban } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import QRCodeModal from '../../components/common/QRCodeModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { submitNTFGatePass, approveGatePassByHR, getGatePassQRCode } from '../../services/api.service';
import { useActionLock } from '../../context/ActionLockContext';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { nowIST } from '../../utils/dateUtils';
import { usePageTitle } from '../../hooks/usePageTitle';

/** Returns current hour in IST (UTC+5:30) */
const getISTHour = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 60 * 60 * 1000).getHours();
};

export default function HRNewPass() {
  usePageTitle('New Pass');
  const { getUserId, user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { withLock } = useActionLock();
  const hrCode = getUserId();
  const hrName = (user as any)?.hrName || (user as any)?.name || 'HR';
  const department = (user as any)?.department || 'HR';
  const initials = hrName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const passDisabled = getISTHour() >= 17;

  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState({ qrCode: '', manualCode: '' });

  const handleSubmit = () => {
    if (!purpose.trim() || !reason.trim()) {
      showError('Missing Info', 'Please fill in both purpose and reason.');
      return;
    }
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    await withLock(async () => {
      try {
        // Step 1: Submit as NTF (skips HOD, goes straight to HR level)
        const submitRes = await submitNTFGatePass({
          staffCode: hrCode,
          purpose: purpose.trim(),
          reason: reason.trim(),
          requestDate: nowIST(),
        });
        if (!submitRes.success) {
          showError('Submission Failed', submitRes.message || 'Failed to submit gate pass.');
          setSubmitting(false);
          return;
        }

        const requestId = (submitRes as any).requestId || (submitRes as any).id || (submitRes as any).data?.id;
        if (!requestId) {
          showError('Error', 'Gate pass submitted but could not retrieve ID. Check My Requests.');
          setSubmitting(false);
          return;
        }

        // Step 2: Auto-approve as HR
        const approveRes = await approveGatePassByHR(hrCode, requestId);
        if (!approveRes.success) {
          showError('Approval Failed', approveRes.message || 'Submitted but auto-approval failed.');
          setSubmitting(false);
          return;
        }

        // Step 3: Fetch QR code
        const qrRes = await getGatePassQRCode(requestId, hrCode);
        setQrData({
          qrCode: qrRes.qrCode || '',
          manualCode: qrRes.manualCode || '',
        });
        setShowQR(true);
        showSuccess('Gate Pass Generated', 'Your gate pass has been instantly approved.');
        setPurpose('');
        setReason('');
      } catch (e: any) {
        showError('Error', e?.message || 'An error occurred.');
      } finally {
        setSubmitting(false);
      }
    }, 'Generating Gate Pass...');
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="text-left px-1">
        <div className="flex items-center gap-2 text-[var(--color-primary)] dark:text-blue-400 mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold tracking-widest uppercase">HR Authorization</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">New Gate Pass</h2>
        <p className="text-xs text-slate-400 mt-1">Instantly approved — QR code generated immediately</p>
      </div>

      {/* Info Banner */}
      <motion.div initial={transitions.page.initial} animate={transitions.page.animate}>
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-indigo-950/20 border border-blue-100 dark:border-indigo-900/30 rounded-2xl">
          <Info className="w-5 h-5 text-[var(--color-primary)] dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--color-primary)] dark:text-indigo-300 font-medium leading-relaxed">
            As HR, your gate pass is instantly approved and a QR code is generated immediately. No approval chain needed.
          </p>
        </div>
      </motion.div>

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

      {/* User Card */}
      <motion.div initial={transitions.page.initial} animate={transitions.page.animate}>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-base shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{hrName}</p>
              <p className="text-xs text-slate-400">{hrCode} • {department}</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg uppercase">Active</span>
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
            placeholder="Enter reason for gate pass..."
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300"
          />
        </div>
      </motion.div>

      {/* Submit */}
      <Button
        fullWidth
        size="lg"
        onClick={handleSubmit}
        disabled={submitting || !purpose.trim() || !reason.trim() || passDisabled}
        className="h-14 rounded-2xl font-bold gap-2"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <QrCode className="w-5 h-5" />
            Generate Gate Pass
          </>
        )}
      </Button>

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Generate Gate Pass" size="sm">
        <div className="space-y-5 pt-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to generate this gate pass? It will be instantly approved.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setShowConfirm(false)} variant="secondary" className="flex-1">Cancel</Button>
            <Button onClick={doSubmit} className="flex-[2]">Generate</Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        qrCode={qrData.qrCode}
        manualCode={qrData.manualCode}
        userName={hrName}
        idNumber={hrCode}
        purpose={purpose}
        title="HR GATE PASS"
        subtitle="INSTANTLY APPROVED"
      />
    </div>
  );
}
