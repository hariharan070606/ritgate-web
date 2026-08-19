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
import PageHeader from '../../components/common/PageHeader';
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
        <PageHeader title="New Request" onBack={handleGoBack} />
      )}

      <main className="desktop-page flex-1 w-full max-w-full px-3 sm:px-5 pt-3 sm:pt-6 pb-28 sm:pb-32 lg:px-0 lg:pt-0 lg:pb-12 box-border overflow-x-hidden min-w-0">
        <div className="w-full max-w-md mx-auto space-y-5 sm:space-y-6 lg:max-w-2xl box-border min-w-0">
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
