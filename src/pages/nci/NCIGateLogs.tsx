import HRGateLogs from '../hr/HRGateLogs';

/**
 * NCIGateLogs — Reuses the canonical GateLogs view with NCI-appropriate permissions.
 */
export default function NCIGateLogs() {
  return <HRGateLogs />;
}
