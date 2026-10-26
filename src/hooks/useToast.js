import { useContext } from 'react';
import { ToastContext } from '../components/Toast';

/**
 * Hook to use toast notifications
 * @returns {Object} Toast methods: success, error, warning, info, addToast, removeToast
 * 
 * @example
 * const { success, error } = useToast();
 * 
 * success('Operation completed!');
 * error('Something went wrong');
 * 
 * // With options
 * success('Saved!', { title: 'Success', duration: 3000 });
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default useToast;
