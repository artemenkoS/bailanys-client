import { MantineProvider } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { LoginForm } from './features/auth/components/LoginForm';
import { RegisterForm } from './features/auth/components/RegisterForm';
import {
  clearSupabaseAuthParams,
  hasSupabaseAuthParams,
  parseSupabaseAuthRedirect,
} from './features/auth/utils/supabaseRedirect';
import { Dashboard } from './features/dashboard/components/Dashboard';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHandlingRedirect = hasSupabaseAuthParams();
  if (isHandlingRedirect) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const redirectResult = parseSupabaseAuthRedirect();
    if (!redirectResult) return;

    if ('error' in redirectResult) {
      notifications.show({
        title: t('notifications.error'),
        message: redirectResult.errorDescription || t('notifications.loginFailed'),
        color: 'red',
      });
      clearSupabaseAuthParams();
      navigate('/login', { replace: true });
      return;
    }

    setAuth(redirectResult.user, redirectResult.session);
    notifications.show({
      title: t('notifications.success'),
      message: t('notifications.loginSuccess'),
      color: 'green',
    });
    clearSupabaseAuthParams();
    navigate('/', { replace: true });
  }, [navigate, setAuth, t]);

  return (
    <Routes>
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/login" element={<LoginForm />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
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
