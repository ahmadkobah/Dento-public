import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { RegionalProvider } from './contexts/RegionalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/Login';

// Admin App (lazy loaded for code splitting)
const AdminApp = lazy(() => import('./admin/AdminApp'));

// Developer Portal (lazy loaded)
const DeveloperApp = lazy(() => import('./developer/DeveloperApp'));

// Loading spinner for lazy loaded components
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <RegionalProvider>
            <ThemeProvider tenantId={null}>
            <ToastProvider>
            <Router>
              <Routes>
                  {/* Auth Routes - Only accessible when NOT logged in */}
                  <Route 
                    path="/login" 
                    element={
                      <PublicOnlyRoute>
                        <Login />
                      </PublicOnlyRoute>
                    } 
                  />

                {/* Developer Portal - Only for developers and admins */}
                <Route 
                  path="/developer/*" 
                  element={
                    <ProtectedRoute allowedRoles={['developer', 'admin']}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <DeveloperApp />
                      </Suspense>
                    </ProtectedRoute>
                  } 
                />

                {/* Admin Routes — Root (/) is the admin entrance */}
                <Route 
                  path="/*" 
                  element={
                    <ProtectedRoute allowedRoles={['developer', 'admin', 'receptionist', 'doctor', 'cbct_tech', 'assistant']}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminApp />
                      </Suspense>
                    </ProtectedRoute>
                  } 
                />
              </Routes>
          </Router>
        </ToastProvider>
        </ThemeProvider>
        </RegionalProvider>
      </AuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
