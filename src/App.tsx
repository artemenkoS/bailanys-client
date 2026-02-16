import { Center, Loader, MantineProvider } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { ForgotPasswordForm } from './features/auth/components/ForgotPasswordForm';
import { LoginForm } from './features/auth/components/LoginForm';
import { RegisterForm } from './features/auth/components/RegisterForm';
import { ResetPasswordForm } from './features/auth/components/ResetPasswordForm';
import { saveRecoverySession } from './features/auth/utils/recoverySession';
import {
  clearSupabaseAuthParams,
  hasSupabaseAuthParams,
  parseSupabaseAuthRedirect,
} from './features/auth/utils/supabaseRedirect';
import { Dashboard } from './features/dashboard/components/Dashboard';
import { GuestRoomPage } from './features/guest/components/GuestRoomPage';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRedirecting = useMemo(() => {
    const currentUrl = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;
    return hasSupabaseAuthParams(currentUrl);
  }, [location.hash, location.pathname, location.search]);
  const hasHandledRedirectRef = useRef(false);

  useEffect(() => {
    if (!isRedirecting) {
      hasHandledRedirectRef.current = false;
      return;
    }

    if (hasHandledRedirectRef.current) return;
    hasHandledRedirectRef.current = true;

    const finish = (path: string) => {
      clearSupabaseAuthParams();
      navigate(path, { replace: true });
    };

    try {
      const redirectResult = parseSupabaseAuthRedirect();
      if (!redirectResult) {
        finish('/login');
        return;
      }

      if ('error' in redirectResult) {
        notifications.show({
          title: t('notifications.error'),
          message: redirectResult.errorDescription || t('notifications.loginFailed'),
          color: 'red',
        });
        finish('/login');
        return;
      }

      if (redirectResult.type === 'recovery') {
        saveRecoverySession(redirectResult.session);
        notifications.show({
          title: t('notifications.success'),
          message: t('notifications.passwordResetReady'),
          color: 'blue',
        });
        finish('/reset-password');
        return;
      }

      setAuth(redirectResult.user, redirectResult.session);
      notifications.show({
        title: t('notifications.success'),
        message: t('notifications.loginSuccess'),
        color: 'green',
      });
      finish('/');
    } catch (error: unknown) {
      notifications.show({
        title: t('notifications.error'),
        message: error instanceof Error ? error.message : t('notifications.loginFailed'),
        color: 'red',
      });
      finish('/login');
    }
  }, [isRedirecting, navigate, setAuth, t]);

  if (isRedirecting) {
    return (
      <Center mih="100vh">
        <Loader size="lg" color="indigo" />
      </Center>
    );
  }

  return (
    <Routes>
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      <Route path="/guest/:token" element={<GuestRoomPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:peerId"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms/:roomId/chat"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}

function App() {
  const { colorScheme } = useThemeStore();

  return (
    <MantineProvider forceColorScheme={colorScheme}>
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}
export default App;
