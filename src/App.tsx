import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { ActionLockProvider } from './context/ActionLockContext';
import { ProfileProvider } from './context/ProfileContext';
import AppRoutes from './routes';
import ToastContainer from './components/ui/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import OfflineStatus from './components/common/OfflineStatus';
import ScrollToTop from './components/common/ScrollToTop';
import SplashScreen from './components/common/SplashScreen';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SplashScreen />
        <ToastProvider>
          <AuthProvider>
            <ActionLockProvider>
              <ProfileProvider>
                <NotificationProvider>
                  <ScrollToTop />
                  <AppRoutes />
                  <ToastContainer />
                  <OfflineStatus />
                </NotificationProvider>
              </ProfileProvider>
            </ActionLockProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
