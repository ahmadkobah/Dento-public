import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * LanguageRouter Context
 * Handles language switching and RTL support
 * 
 * URL Structure:
 * - /services -> English (default)
 * - /ar/services -> Arabic
 * 
 * Features:
 * - URL-based language detection
 * - RTL direction management
 * - localStorage persistence
 * - hreflang meta tags
 */

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageRouter');
  }
  return context;
};

// Supported languages
export const LANGUAGES = {
  EN: 'en',
  AR: 'ar',
};

export const LanguageRouter = ({ 
  children, 
  defaultLanguage = LANGUAGES.EN,
  supportedLanguages = [LANGUAGES.EN, LANGUAGES.AR] 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Detect language from URL
  const getLanguageFromPath = useCallback((pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0 && supportedLanguages.includes(segments[0])) {
      return segments[0];
    }
    return defaultLanguage;
  }, [defaultLanguage, supportedLanguages]);

  const [language, setLanguageState] = useState(() => {
    // Check URL first
    const urlLang = getLanguageFromPath(location.pathname);
    if (urlLang !== defaultLanguage) return urlLang;
    
    // Then localStorage
    const stored = localStorage.getItem('dento_language');
    if (stored && supportedLanguages.includes(stored)) return stored;
    
    // Then browser preference
    const browserLang = navigator.language.split('-')[0];
    if (supportedLanguages.includes(browserLang)) return browserLang;
    
    return defaultLanguage;
  });

  const isRTL = language === LANGUAGES.AR;

  // Update HTML attributes when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    localStorage.setItem('dento_language', language);
  }, [language, isRTL]);

  // Sync with URL changes
  useEffect(() => {
    const urlLang = getLanguageFromPath(location.pathname);
    if (urlLang !== language) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing with React Router location (external system)
      setLanguageState(urlLang);
    }
  }, [location.pathname, language, getLanguageFromPath]);

  /**
   * Change language and update URL
   */
  const setLanguage = useCallback((newLang) => {
    if (!supportedLanguages.includes(newLang)) {
      console.warn(`Language ${newLang} is not supported`);
      return;
    }

    if (newLang === language) return;

    // Update URL to reflect new language
    const currentPath = location.pathname;
    const currentLang = getLanguageFromPath(currentPath);
    
    let newPath;
    if (currentLang !== defaultLanguage) {
      // Remove current language prefix
      const pathWithoutLang = currentPath.replace(`/${currentLang}`, '') || '/';
      if (newLang === defaultLanguage) {
        newPath = pathWithoutLang;
      } else {
        newPath = `/${newLang}${pathWithoutLang}`;
      }
    } else {
      // Add new language prefix
      if (newLang === defaultLanguage) {
        newPath = currentPath;
      } else {
        newPath = `/${newLang}${currentPath}`;
      }
    }

    setLanguageState(newLang);
    navigate(newPath, { replace: true });
  }, [language, location.pathname, navigate, defaultLanguage, getLanguageFromPath, supportedLanguages]);

  /**
   * Get localized path
   */
  const getLocalizedPath = useCallback((path, targetLang = language) => {
    // Remove any existing language prefix
    const cleanPath = path.replace(/^\/(en|ar)/, '') || '/';
    
    if (targetLang === defaultLanguage) {
      return cleanPath;
    }
    return `/${targetLang}${cleanPath}`;
  }, [language, defaultLanguage]);

  /**
   * Get content based on current language
   */
  const t = useCallback((enText, arText) => {
    return language === LANGUAGES.AR ? (arText || enText) : enText;
  }, [language]);

  /**
   * Toggle between languages
   */
  const toggleLanguage = useCallback(() => {
    const newLang = language === LANGUAGES.EN ? LANGUAGES.AR : LANGUAGES.EN;
    setLanguage(newLang);
  }, [language, setLanguage]);

  const value = {
    language,
    setLanguage,
    isRTL,
    isArabic: language === LANGUAGES.AR,
    isEnglish: language === LANGUAGES.EN,
    getLocalizedPath,
    toggleLanguage,
    t,
    supportedLanguages,
    defaultLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * LanguageSwitcher Component
 * UI component for switching languages
 */
export const LanguageSwitcher = ({ className = '' }) => {
  const { language, setLanguage, _isRTL } = useLanguage();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => setLanguage(LANGUAGES.EN)}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          language === LANGUAGES.EN
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage(LANGUAGES.AR)}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          language === LANGUAGES.AR
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        عربي
      </button>
    </div>
  );
};

export default LanguageRouter;
