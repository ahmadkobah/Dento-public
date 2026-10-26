import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const { signIn, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = language === 'ar';

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // If user is already logged in (e.g., page refresh), redirect immediately
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally excluding user, navigate, location

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');

    try {
      const { error: signInError } = await signIn(data.email, data.password, rememberMe);

      if (signInError) {
        // Handle specific error messages
        if (signInError.message.includes('Invalid login')) {
          setError(isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
        } else if (signInError.message.includes('deactivated')) {
          setError(signInError.message);
        } else {
          setError(isRTL ? 'حدث خطأ. حاول مرة أخرى' : 'An error occurred. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }
      
      // Navigate directly to dashboard (or the page user was trying to access)
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch {
      setError(isRTL ? 'حدث خطأ. حاول مرة أخرى' : 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const translations = {
    title: { en: 'Sign In', ar: 'تسجيل الدخول' },
    subtitle: { en: 'Welcome back! Please sign in to continue.', ar: 'مرحباً بعودتك! يرجى تسجيل الدخول للمتابعة.' },
    email: { en: 'Email', ar: 'البريد الإلكتروني' },
    emailPlaceholder: { en: 'Enter your email', ar: 'أدخل بريدك الإلكتروني' },
    password: { en: 'Password', ar: 'كلمة المرور' },
    passwordPlaceholder: { en: 'Enter your password', ar: 'أدخل كلمة المرور' },
    rememberMe: { en: 'Remember me', ar: 'تذكرني' },
    forgotPassword: { en: 'Forgot password?', ar: 'نسيت كلمة المرور؟' },
    signIn: { en: 'Sign In', ar: 'تسجيل الدخول' },
    signingIn: { en: 'Signing in...', ar: 'جاري تسجيل الدخول...' },
    invalidEmail: { en: 'Invalid email address', ar: 'عنوان بريد إلكتروني غير صالح' },
    passwordMin: { en: 'Password must be at least 6 characters', ar: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
  };

  const getText = (key) => translations[key]?.[language] || translations[key]?.en || key;

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Title */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold text-primary-600">Dento</h1>
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {getText('title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getText('subtitle')}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {getText('email')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={`block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400`}
                  placeholder={getText('emailPlaceholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{getText('invalidEmail')}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {getText('password')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`block w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400`}
                  placeholder={getText('passwordPlaceholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{getText('passwordMin')}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">{getText('rememberMe')}</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                {getText('forgotPassword')}
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  {getText('signingIn')}
                </>
              ) : (
                getText('signIn')
              )}
            </button>
          </form>
        </div>


      </div>
    </div>
  );
};

export default Login;
