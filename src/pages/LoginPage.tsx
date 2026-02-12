import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BrandMark from '../components/BrandMark';
import { APP_NAME } from '../lib/brand';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { user, signIn, signInWithOAuth, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // After OAuth redirect: clean hash from URL and go to dashboard
  useEffect(() => {
    if (!user || !window.location.hash) return;
    window.history.replaceState(null, '', window.location.pathname);
    navigate('/', { replace: true });
  }, [user, navigate]);

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
      // Browser redirects to provider; if no redirect (error), we stay here
    } catch (err: any) {
      toast.error(err.message || `Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Signed in successfully');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast.error('Enter your email first');
      return;
    }
    try {
      await resetPassword(email);
      toast.success('Password reset link sent to your email');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-ghost-900">
      <div
        className="w-full shrink-0 h-8 min-h-[32px]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <BrandMark className="w-10 h-10 shrink-0" />
          <h1 className="text-3xl font-bold">{APP_NAME}</h1>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Sign In</h2>

          <div className="flex flex-col gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-ghost-700 hover:bg-ghost-600 border border-ghost-600 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {oauthLoading === 'google' ? 'Redirecting...' : 'Continue with Google'}
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={!!oauthLoading}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-ghost-700 hover:bg-ghost-600 border border-ghost-600 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              {oauthLoading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
            </button>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ghost-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-ghost-800 text-gray-400">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button onClick={handleReset} className="text-accent hover:text-accent-hover">
              Forgot password?
            </button>
            <Link to="/register" className="text-accent hover:text-accent-hover">
              Create account
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
