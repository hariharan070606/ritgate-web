import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useActionLock } from '../../context/ActionLockContext';
import { useFieldValidation } from '../../hooks/useFieldValidation';
import { submitStudentGatePass } from '../../services/api.service';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import SuccessModal from '../../components/common/SuccessModal';
import ErrorModal from '../../components/common/ErrorModal';
import SinglePassRequestForm from '../../components/common/SinglePassRequestForm';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import { getRequestDate } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import { useGatePassCurfew } from '../../hooks/useGatePassCurfew';
import type { Student } from '../../types';

export default function NewRequest() {
  usePageTitle('New Request');
  const navigate = useNavigate();
  const { user: rawUser } = useAuth();
  const user = rawUser as Student;
  const { isDesktop } = useAdaptive();
  const { withLock, isLocked } = useActionLock();
  const { isCurfewPassed, curfewDisplay, loading: curfewLoading } = useGatePassCurfew();

  // Block access after curfew IST
  useEffect(() => {
    if (!curfewLoading && isCurfewPassed) {
      navigate('/dashboard', { replace: true });
    }
  }, [curfewLoading, isCurfewPassed, navigate]);

  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUri, setAttachmentUri] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>();

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { errors, validateAll, fieldProps } = useFieldValidation({
    purpose: v => !v.trim() ? 'Purpose is required' : undefined,
    reason:  v => !v.trim() ? 'Please describe your reason' : v.trim().length < 10 ? 'Too short — add more detail' : undefined,
  });

  const isFormValid = purpose.trim() && reason.trim();

  const handleSubmit = async () => {
    if (isCurfewPassed) {
      setErrorMessage(`Student gate pass requests are closed after ${curfewDisplay} IST.`);
      setShowError(true);
      return;
    }
    if (!validateAll({ purpose, reason })) return;
    
    await withLock(async () => {
      try {
        const response = await submitStudentGatePass({
          regNo: user?.regNo || '',
          purpose: purpose.trim(),
          reason: reason.trim(),
          requestDate: getRequestDate(),
          attachmentUri: attachmentUri || undefined,
        });

        if (response.success) {
          setShowSuccess(true);
        } else {
          setErrorMessage(response.message || 'Could not submit request');
          setShowError(true);
        }
      } catch (err) {
        setErrorMessage('Network error occurred. Please try again.');
        setShowError(true);
      }
    }, 'Submitting Request...');
  };

  const handleGoBack = () => {
    if (purpose || reason || attachmentUri) {
      if (window.confirm('Discard changes and go back?')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden flex flex-col box-border min-w-0 min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      {/* Mobile Header */}
      {!isDesktop && (
        <header
          className="sticky inset-x-0 top-0 z-[90] bg-white/95 dark:bg-slate-950/95 border-b border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl shrink-0 lg:hidden box-border"
        >
          <div className="relative flex items-center justify-between h-16 px-4 sm:px-6 w-full max-w-full box-border">
            <button
              onClick={handleGoBack}
              className="w-10 h-10 rounded-full bg-slate-100/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform shrink-0 z-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="absolute left-16 right-16 text-center text-[17px] font-black text-slate-900 dark:text-white tracking-wider leading-none truncate uppercase">
              New Request
            </h1>
            <div className="w-10 shrink-0" />
          </div>
        </header>
      )}

      <main className="desktop-page flex-1 w-full max-w-full px-4 sm:px-5 pt-4 sm:pt-6 pb-32 lg:px-0 lg:pt-0 lg:pb-12 box-border overflow-x-hidden min-w-0">
        <div className="w-full max-w-md mx-auto space-y-6 lg:max-w-2xl box-border min-w-0">
          {isDesktop && (
            <DesktopPageHeader
              eyebrow="Gate Pass"
              title="New Gate Pass Request"
              subtitle="Provide your purpose and details, then submit for staff authorization"
            />
          )}
          <SinglePassRequestForm
            eyebrow="Student Single Pass"
            title="Gate Pass Request"
            subtitle="Create a new student gate pass request and submit it for staff authorization."
            profileName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Student'}
            profileMeta={`${user?.department || 'Department'} - ${user?.regNo || ''}`}
            initials={user?.firstName?.charAt(0) || 'S'}
            purpose={purpose}
            onPurposeChange={v => { setPurpose(v); fieldProps('purpose', v).onChange({ target: { value: v } } as any); }}
            purposeError={errors.purpose}
            reason={reason}
            onReasonChange={v => { setReason(v); fieldProps('reason', v).onChange({ target: { value: v } } as any); }}
            onReasonBlur={fieldProps('reason', reason).onBlur}
            reasonError={errors.reason}
            reasonPlaceholder="Please provide specific details for your outing..."
            attachmentUri={attachmentUri}
            attachmentName={attachmentName}
            onAttachmentChange={(value, name) => {
              setAttachmentUri(value);
              setAttachmentName(name);
            }}
            submitText="Send Request"
            submitting={isLocked}
            disabled={!isFormValid || isLocked}
            onSubmit={() => setShowConfirmSubmit(true)}
          />
        </div>
      </main>

      {/* Modals */}
      <ConfirmationModal 
        visible={showConfirmSubmit}
        onCancel={() => setShowConfirmSubmit(false)}
        onConfirm={() => {
          setShowConfirmSubmit(false);
          handleSubmit();
        }}
        title="Submit Request"
        message="Are you sure you want to submit this gate pass request for authorization?"
        confirmText="Yes, Submit"
        confirmColor="bg-blue-600 hover:bg-blue-700"
      />

      <SuccessModal 
        visible={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigate('/dashboard');
        }}
        title="Request Dispatched"
        message="Your gate pass request has been successfully submitted and is awaiting staff authorization."
      />

      <ErrorModal 
        visible={showError}
        type="general"
        onClose={() => setShowError(false)}
        title="Submission Failed"
        message={errorMessage}
      />
    </div>
  );
}
