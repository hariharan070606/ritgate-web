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
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';
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
    await withLock(async () => {
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
    }, 'Authorizing...');
    setProcessing(false);
  };

  const handleReject = async (id: number, remark: string) => {
    if (!userId || !role) return;
    if (!remark.trim()) {
      showError('Remark Required', 'Please add review notes before rejecting.');
      return;
    }
    setProcessing(true);
    await withLock(async () => {
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
    }, 'Rejecting...');
    setProcessing(false);
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

  // Decided requests (approved/rejected/used/exited) — and viewers who cannot
  // review — open the read-only "Request Details" modal on EVERY viewport,
  // including desktop/tablet.
  if (!showReviewActions) {
    return (
      <SinglePassDetailsModal
        isOpen
        onClose={handleClose}
        request={request}
        showActions={false}
      />
    );
  }

  // Pending request + reviewer on phone → the same modal with approve/reject.
  if (!isDesktop) {
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

  // Pending request + reviewer on desktop → the dedicated approval page.
  const status = getStatus(request);
  const requesterName = getRequesterName(request);
  const identifier = request.regNo || request.staffCode || userId || 'N/A';
  const department = request.department || 'N/A';

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <section className="desktop-card overflow-hidden">
        <div className="bg-transparent px-5 py-6 lg:px-6 lg:py-6">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] bg-amber-500 text-[28px] font-black text-white shadow-lg shadow-amber-100 dark:shadow-none">
                  {getInitials(requesterName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[24px] font-black uppercase tracking-tight text-slate-950 dark:text-white">
                    {requesterName}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {identifier} - {department}
                  </p>
                </div>
                <span className={cn('shrink-0 rounded-xl px-4 py-2 text-[12px] font-black uppercase tracking-widest', getStatusClasses(status))}>
                  {status}
                </span>
              </div>
            </div>

            <div className="grid overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
              <div className="border-b border-slate-50 p-6 dark:border-slate-800 md:border-b-0 md:border-r">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Purpose</p>
                <p className="text-lg font-black text-slate-950 dark:text-white">
                  {request.purpose || 'General'}
                </p>
              </div>
              <div className="p-6">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Date</p>
                <p className="text-lg font-black text-slate-950 dark:text-white">
                  {formatDate(request.visitDate || request.exitDateTime || request.requestDate || request.createdAt)}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Reason</p>
              <p className="text-base font-semibold italic leading-relaxed text-slate-700 dark:text-slate-300">
                {request.reason || 'No reason provided.'}
              </p>
            </div>

            {showReviewActions && (
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <textarea
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="Add review notes (required for rejection)..."
                  className="min-h-[82px] w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={processing}
                />
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Button
                    variant="danger"
                    size="xl"
                    fullWidth
                    icon={<AlertCircle className="h-5 w-5" />}
                    onClick={handleDesktopReject}
                    disabled={processing}
                    className="h-[70px] rounded-[28px] text-[18px] uppercase tracking-[0.18em] shadow-xl shadow-rose-100 dark:shadow-none"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    size="xl"
                    fullWidth
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    onClick={handleDesktopApprove}
                    isLoading={processing}
                    disabled={processing}
                    className="h-[70px] rounded-[28px] text-[18px] uppercase tracking-[0.18em] shadow-xl shadow-emerald-100 dark:shadow-none"
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
