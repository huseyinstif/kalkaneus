import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

let toastId = 0;
const toastListeners = new Set();

export const toast = {
  success: (message, description = null, duration = 3000) => {
    showToast({ type: 'success', message, description, duration });
  },
  error: (message, description = null, duration = 3000) => {
    showToast({ type: 'error', message, description, duration });
  },
  info: (message, description = null, duration = 3000) => {
    showToast({ type: 'info', message, description, duration });
  },
  warning: (message, description = null, duration = 3000) => {
    showToast({ type: 'warning', message, description, duration });
  },
};

function showToast(toast) {
  const id = toastId++;
  const toastWithId = { ...toast, id };
  toastListeners.forEach(listener => listener(toastWithId));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (toast) => {
      setToasts(prev => [...prev, toast]);
      
      if (toast.duration) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, toast.duration);
      }
    };

    toastListeners.add(listener);
    return () => toastListeners.delete(listener);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ type, message, description, onClose }) {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-900/90',
      borderColor: 'border-green-500',
      iconColor: 'text-green-400',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-900/90',
      borderColor: 'border-red-500',
      iconColor: 'text-red-400',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-900/90',
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-400',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-900/90',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-400',
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor } = config[type];

  return (
    <div
      className={`
        ${bgColor} ${borderColor}
        border-l-4 rounded shadow-lg
        min-w-[300px] max-w-md
        p-4 flex items-start space-x-3
        animate-slide-in-right
      `}
    >
      <Icon className={`${iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-100">{message}</p>
        {description && (
          <p className="text-xs text-gray-300 mt-1 opacity-90">{description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
