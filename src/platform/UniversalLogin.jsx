import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Helper to log login attempts
const logLoginAttempt = async (userId, success, failureReason = null, tenantId = null) => {
  try {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    await supabase.from('login_history').insert({
      user_id: userId,
      success,
      failure_reason: failureReason,
      user_agent: ua,
      device_type: deviceType,
      tenant_id: tenantId,
    });
  } catch (err) {
    console.error('Failed to log login:', err);
  }
};

/**
 * UniversalLogin Component
 * Login page for the main platform (app.dento.com)
 * 
 * Features:
 * - Email/password login
 * - Magic link option
 * - Google OAuth
 * - Clinic selector for multi-clinic users
 * - Remember me
 * - Redirect to appropriate tenant after login
 */
const UniversalLogin = () => {
  const _navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('return_to');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('password'); // 'password' | 'magic' | 'select-clinic'
  const [userClinics, setUserClinics] = useState([]);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handlePostLogin(session.user);
      }
    };
    checkSession();
  }, []);

  // Handle successful login
  const handlePostLogin = async (user) => {
    try {
      // Fetch user's clinics
      const { data: memberships, error: fetchError } = await supabase
        .from('tenant_users')
        .select(`
          role,
          is_active,
          tenant:tenants (
            id, name, slug, logo_url, status
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const activeClinics = memberships
        .filter(m => m.tenant.status === 'active')
        .map(m => ({ ...m.tenant, role: m.role }));

      if (activeClinics.length === 0) {
        setError('No active clinic memberships found. Contact your clinic administrator.');
        return;
      }

      if (activeClinics.length === 1) {
        // Single clinic - redirect directly
        redirectToClinic(activeClinics[0]);
      } else {
        // Multiple clinics - show selector
        setUserClinics(activeClinics);
        setMode('select-clinic');
      }
    } catch (err) {
      console.error('Post-login error:', err);
      setError('Failed to load your clinics. Please try again.');
    }
  };

  // Redirect to selected clinic
  const redirectToClinic = (clinic) => {
    if (returnTo) {
      window.location.href = returnTo;
    } else {
      // Redirect to clinic's admin panel
      window.location.href = `https://${clinic.slug}.dento.app/admin`;
    }
  };

  // Handle email/password login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Log successful login
      await logLoginAttempt(data.user.id, true);

      await handlePostLogin(data.user);
    } catch (err) {
      console.error('Login error:', err);
      // Log failed login
      await logLoginAttempt(null, false, err.message);
      setError(err.message === 'Invalid login credentials' 
        ? 'Invalid email or password' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle magic link login
  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (signInError) throw signInError;

      setMagicLinkSent(true);
    } catch (err) {
      console.error('Magic link error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (signInError) throw signInError;
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Magic link sent confirmation
  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a magic link to <strong>{email}</strong>. 
            Click the link to sign in.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  // Clinic selection mode
  if (mode === 'select-clinic') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Select Clinic</h2>
          <p className="text-gray-600 mb-6 text-center">
            Choose which clinic to access
          </p>

          <div className="space-y-3">
            {userClinics.map((clinic) => (
              <button
                key={clinic.id}
                onClick={() => redirectToClinic(clinic)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                {clinic.logo_url ? (
                  <img src={clinic.logo_url} alt={clinic.name} className="w-12 h-12 rounded-lg object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-600">{clinic.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">{clinic.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{clinic.role}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setMode('password');
              setUserClinics([]);
            }}
            className="w-full mt-6 text-center text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Dento</h1>
          <p className="text-gray-600 mt-1">Sign in to manage your clinic</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="font-medium text-gray-700">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={mode === 'magic' ? handleMagicLink : handlePasswordLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="you@example.com"
              />
            </div>

            {mode === 'password' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === 'password' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <a href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Toggle login mode */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'magic' ? 'password' : 'magic')}
            className="text-sm text-gray-600 hover:text-primary-600"
          >
            {mode === 'magic' ? 'Use password instead' : 'Sign in with magic link'}
          </button>
        </div>

        {/* Register link */}
        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Register your clinic
          </a>
        </p>
      </div>
    </div>
  );
};

export default UniversalLogin;
