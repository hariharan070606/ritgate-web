import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const source = join(dist, 'index.html');

const routes = [
  'login',
  'verify-otp',
  'splash',
  'login-scan',
  'dashboard',
  'requests',
  'history',
  'qr-codes',
  'new-request',
  'new-pass',
  'my-requests',
  'bulk-pass',
  'hod-events',
  'event-csv',
  'gate-logs',
  'exits',
  'guest-register',
  'scanner',
  'active-persons',
  'vehicles',
  'scan-history',
  'visitor-register',
  'visitor-qr',
  'hod-contacts',
  'profile',
  'notifications',
  'participants',
  'pass-verification',
];

if (!existsSync(source)) {
  throw new Error('dist/index.html not found. Run vite build before creating route fallbacks.');
}

for (const route of routes) {
  const routeDir = join(dist, route);
  mkdirSync(routeDir, { recursive: true });
  copyFileSync(source, join(routeDir, 'index.html'));
}

copyFileSync(source, join(dist, '404.html'));

console.log(`Created SPA route fallbacks for ${routes.length} routes.`);
