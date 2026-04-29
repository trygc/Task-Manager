import React from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

function createToast(type: ToastType, message: string, options: ToastOptions = {}) {
  const { title, description, duration = 4000, action } = options;
  const Icon = toastIcons[type];
  const iconStyle = toastStyles[type];

  return toast(
    <div className="flex items-start gap-3">
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconStyle}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            {title}
          </div>
        )}
        <div className="text-zinc-700 dark:text-zinc-300 text-sm">
          {message}
        </div>
        {description && (
          <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
            {description}
          </div>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>,
    {
      duration,
      className: 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950',
    }
  );
}

export const notifications = {
  success: (message: string, options?: ToastOptions) => 
    createToast('success', message, options),
  
  error: (message: string, options?: ToastOptions) => 
    createToast('error', message, options),
  
  warning: (message: string, options?: ToastOptions) => 
    createToast('warning', message, options),
  
  info: (message: string, options?: ToastOptions) => 
    createToast('info', message, options),

  // Convenience methods for common scenarios
  saveSuccess: () => 
    notifications.success('Changes saved successfully'),
  
  saveError: (error?: string) => 
    notifications.error('Failed to save changes', {
      description: error || 'Please try again or contact support if the problem persists.',
    }),
  
  loadError: (error?: string) => 
    notifications.error('Failed to load data', {
      description: error || 'Please refresh the page or contact support if the problem persists.',
    }),
  
  networkError: () => 
    notifications.error('Network connection failed', {
      description: 'Please check your internet connection and try again.',
    }),
  
  validationError: (message: string) => 
    notifications.warning('Validation Error', {
      description: message,
    }),
  
  permissionError: () => 
    notifications.error('Permission denied', {
      description: 'You do not have permission to perform this action.',
    }),
};