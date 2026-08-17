import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { useActionLock } from '../../context/ActionLockContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  approveGatePassByHOD,
  approveGatePassByHR,
  approveGatePassByStaff,
  getHODAllRequests,
  getHRAllRequests,
  getNCIOwnRequests,
  getNTFOwnRequests,
  getStaffAllRequests,
  getStaffOwnRequests,
  getStudentGatePassRequests,
  rejectGatePassByHOD,
  rejectGatePassByHR,
  rejectGatePassByStaff,
} from '../../services/api.service';
import { AlertCircle, CheckCircle2, FileText, Target, CalendarDays, StickyNote } from 'lucide-react';
import SectionLabel from '../../components/common/SectionLabel';
import { useAdaptive } from '../../utils/useAdaptive';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/date';

export default function PassVerificationPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { role, getUserId } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { withLock } = useActionLock();
  const { isDesktop } = useAdaptive();

  const userId = getUserId();
  const numericRequestId = Number(requestId);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [remark, setRemark] = useState('');

  const canReview = useMemo(
    () => ['STAFF', 'HOD', 'HR'].includes(role || ''),
    [role],
  );

  const loadRequest = async () => {
    if (!userId || !Number.isFinite(numericRequestId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let requests: any[] = [];

      if (role === 'STUDENT') {
        const res = await getStudentGatePassRequests(userId);
        requests = res.requests || [];
      } else if (role === 'HOD') {
        const res = await getHODAllRequests(userId);
        requests = res.requests || [];
      } else if (role === 'HR') {
        const res = await getHRAllRequests(userId);
        requests = res.requests || [];
      } else if (role === 'NON_TEACHING') {
        const res = await getNTFOwnRequests(userId);
        requests = res.requests || [];
      } else if (role === 'NON_CLASS_INCHARGE') {
        const res = await getNCIOwnRequests(userId);
        requests = res.requests || [];
      } else {
        const [ownRes, assignedRes] = await Promise.all([
          getStaffOwnRequests(userId),
          getStaffAllRequests(userId),
        ]);
        requests = [...(ownRes.requests || []), ...(assignedRes.requests || [])];
      }

      setRequest(requests.find((item) => Number(item.id) === numericRequestId) || null);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [requestId, role, userId]);

  const handleClose = () => {
    navigate(-1);
  };

  // Use the request's real status (not the per-stage hrApproval flag, which
  // wrongly showed PENDING for already-approved requests).
  const getStatus = (item: any) => {
    const raw = (item?.status || 'PENDING').toUpperCase();
    if (raw.startsWith('PENDING')) return 'PENDING';
    if (raw === 'APPROVED_BY_STAFF' || raw === 'APPROVED_BY_HOD') return 'IN REVIEW';
    return raw;
  };

  // A decided request (approved/rejected/used/exited) is read-only — no review
  // actions, so clicking "Details" on it opens an info view, not the approval UI.
  const isDecided = (item: any) => {
    const raw = (item?.status || '').toUpperCase();
    return raw === 'APPROVED' || raw === 'REJECTED' || raw === 'USED' || raw === 'EXITED';
  };

  const getStatusClasses = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-500 text-white';
    if (status === 'REJECTED') return 'bg-rose-500 text-white';
    return 'bg-amber-500 text-white';
  };

  const getRequesterName = (item: any) =>
    item?.studentName || item?.staffName || item?.requesterName || item?.regNo || 'Request User';

  const getInitials = (name: string) =>
    (name || 'RU')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const handleApprove = async (id: number, remark: string) => {
    if (!userId || !role) return;
    setProcessing(true);
    try {
      const res = role === 'HOD'
        ? await approveGatePassByHOD(userId, id, remark)
        : role === 'HR'
          ? await approveGatePassByHR(userId, id)
          : await approveGatePassByStaff(userId, id, remark);

      if (res.success) {
        showSuccess('Approved', 'Request authorized successfully');
        navigate('/dashboard', { replace: true });
      } else {
        showError('Failed', res.message || 'Unable to approve request');
      }
    } catch {
      showError('Error', 'An internal error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: number, remark: string) => {
    if (!userId || !role) return;
    if (!remark.trim()) {
      showError('Remark Required', 'Please add review notes before rejecting.');
      return;
    }
    setProcessing(true);
    try {
      const res = role === 'HOD'
        ? await rejectGatePassByHOD(userId, id, remark)
        : role === 'HR'
          ? await rejectGatePassByHR(userId, id, remark)
          : await rejectGatePassByStaff(userId, id, remark);

      if (res.success) {
        showSuccess('Rejected', 'Request has been rejected');
        navigate('/dashboard', { replace: true });
      } else {
        showError('Failed', res.message || 'Unable to reject request');
      }
    } catch {
      showError('Error', 'An internal error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleDesktopApprove = () => handleApprove(request.id, remark);
  const handleDesktopReject = () => handleReject(request.id, remark);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center px-5">
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Request not found"
          description="This request is unavailable or you do not have access to review it."
          action={<Button onClick={() => navigate('/dashboard', { replace: true })}>Back to Dashboard</Button>}
        />
      </div>
    );
  }

  const showReviewActions = canReview && !isDecided(request);

  return (
    <SinglePassDetailsModal
      isOpen
      onClose={handleClose}
      request={request}
      onApprove={handleApprove}
      onReject={handleReject}
      showActions={showReviewActions}
      processing={processing}
    />
  );
}
