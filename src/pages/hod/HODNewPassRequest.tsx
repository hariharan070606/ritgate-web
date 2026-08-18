import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { submitHODGatePass } from '../../services/api.service';
import SinglePassRequestForm from '../../components/common/SinglePassRequestForm';

interface HODNewPassRequestProps {
  user: any;
  onBack: () => void;
}

export default function HODNewPassRequest({ user, onBack }: HODNewPassRequestProps) {
  const { getUserId } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const hodCode = getUserId();

  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUri, setAttachmentUri] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>();

  const hodName = (user as any)?.hodName || (user as any)?.name || 'HOD Member';
  const initials = hodName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const submitRequest = async () => {
    if (!purpose.trim() || !reason.trim()) return showToastError('Missing Fields', 'Please fill all required fields');
    
    await withLock(async () => {
       try {
         const res = await submitHODGatePass(
            hodCode,
            purpose.trim(),
            reason.trim(),
            attachmentUri || undefined
         );
         if (res.success) {
           showToastSuccess('Request Dispatched', 'Your authorization pass has been submitted for HR review.');
           setPurpose(''); setReason(''); setAttachmentUri(''); setAttachmentName(undefined);
           onBack();
         } else showToastError('Failed', res.message);
       } catch { showToastError('Error', 'An internal error occurred'); }
    }, 'Dispatching authorization...');
  };

  return (
    <SinglePassRequestForm
      eyebrow="Single Pass Request"
      title="Gate Pass Request"
      subtitle="Provide the purpose, reason, and optional attachment for this request."
      profileName={hodName}
      profileMeta={`HOD - ${user?.department || 'Department'}`}
      initials={initials}
      purpose={purpose}
      onPurposeChange={setPurpose}
      reason={reason}
      onReasonChange={setReason}
      reasonPlaceholder="Please provide more context for your exit..."
      attachmentUri={attachmentUri}
      attachmentName={attachmentName}
      onAttachmentChange={(value, name) => {
        setAttachmentUri(value);
        setAttachmentName(name);
      }}
      submitText="Send Request"
      disabled={!purpose.trim() || !reason.trim()}
      onSubmit={submitRequest}
    />
  );
}
