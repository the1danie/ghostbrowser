import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfileEditPage from './pages/ProfileEditPage';
import ProxyPage from './pages/ProxyPage';
import SettingsPage from './pages/SettingsPage';

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Полоска для перетаскивания окна (Electron hiddenInset) */}
        <div
          className="w-full shrink-0 h-8 min-h-[32px]"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-ghost-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#272d45', color: '#e5e7eb', border: '1px solid #343c5c' },
        }}
      />
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route
              path="/"
              element={
                <AuthLayout>
                  <DashboardPage />
                </AuthLayout>
              }
            />
            <Route
              path="/profile/new"
              element={
                <AuthLayout>
                  <ProfileEditPage />
                </AuthLayout>
              }
            />
            <Route
              path="/profile/:id"
              element={
                <AuthLayout>
                  <ProfileEditPage />
                </AuthLayout>
              }
            />
            <Route
              path="/proxies"
              element={
                <AuthLayout>
                  <ProxyPage />
                </AuthLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <AuthLayout>
                  <SettingsPage />
                </AuthLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}
