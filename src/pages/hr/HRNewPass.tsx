import { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Ban } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import QRCodeModal from '../../components/common/QRCodeModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { submitNTFGatePass, approveGatePassByHR, getGatePassQRCode } from '../../services/api.service';
import { useActionLock } from '../../context/ActionLockContext';
import { transitions } from '../../design-system/animations';
import { nowIST } from '../../utils/dateUtils';
import { usePageTitle } from '../../hooks/usePageTitle';
import { PASS_COPY } from '../../config/nativeCopy';
import SinglePassRequestForm from '../../components/common/SinglePassRequestForm';

/** Returns current hour in IST (UTC+5:30) */
const getISTHour = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 60 * 60 * 1000).getHours();
};

export default function HRNewPass() {
  usePageTitle(PASS_COPY.newRequest);
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
  const [attachmentUri, setAttachmentUri] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
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
          attachmentUri: attachmentUri || undefined,
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
        setAttachmentUri('');
        setAttachmentName(undefined);
      } catch (e: any) {
        showError('Error', e?.message || 'An error occurred.');
      } finally {
        setSubmitting(false);
      }
    }, 'Generating Gate Pass...');
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border max-w-md mx-auto space-y-6 pb-10 lg:max-w-4xl">

      {/* Time restriction banner */}
      {passDisabled && (
        <motion.div initial={transitions.page.initial} animate={transitions.page.animate}>
          <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
            <Ban className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Not Available</p>
              <p className="text-xs text-rose-600 dark:text-rose-400/80 font-medium leading-relaxed mt-0.5">
                {PASS_COPY.unavailableAfterFive}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div initial={transitions.page.initial} animate={transitions.page.animate}>
        <SinglePassRequestForm
          eyebrow="Single Pass Request"
          title={PASS_COPY.newRequest}
          subtitle="Provide the purpose, reason, and optional attachment for this request."
          profileName={hrName}
          profileMeta={`${hrCode} - ${department}`}
          initials={initials}
          purpose={purpose}
          onPurposeChange={setPurpose}
          reason={reason}
          onReasonChange={setReason}
          reasonPlaceholder="Enter reason for gate pass..."
          attachmentUri={attachmentUri}
          attachmentName={attachmentName}
          onAttachmentChange={(value, name) => {
            setAttachmentUri(value);
            setAttachmentName(name);
          }}
          submitText="Generate Gate Pass"
          submitting={submitting}
          disabled={submitting || !purpose.trim() || !reason.trim() || passDisabled}
          onSubmit={handleSubmit}
          buttonIcon={<QrCode className="h-5 w-5" />}
        />
      </motion.div>

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
