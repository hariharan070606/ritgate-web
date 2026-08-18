import HRGateLogs from '../hr/HRGateLogs';

interface AdminScanHistoryProps {
  onBack?: () => void;
}

/**
 * AdminScanHistory — Reuses the canonical GateLogs view with Admin-appropriate endpoints and export capabilities.
 */
export default function AdminScanHistory({ onBack }: AdminScanHistoryProps = {}) {
  return <HRGateLogs onBack={onBack} />;
}
