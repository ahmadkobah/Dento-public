import PropTypes from 'prop-types';

/**
 * LoadingScreen Component
 * Full-screen loading indicator with optional message
 */
const LoadingScreen = ({ message = 'Loading...', showLogo = true }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      {showLogo && (
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Spinner */}
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
        <div className="w-12 h-12 border-4 border-primary-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>

      {/* Message */}
      {message && (
        <p className="mt-6 text-gray-600 font-medium animate-pulse">{message}</p>
      )}
    </div>
  );
};

LoadingScreen.propTypes = {
  message: PropTypes.string,
  showLogo: PropTypes.bool,
};

export default LoadingScreen;
