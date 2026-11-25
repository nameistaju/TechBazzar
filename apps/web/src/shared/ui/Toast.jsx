import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import useToastStore from '@shared/store/toastStore';
import { useStore } from '@app/providers/StoreContext';

export default function Toast() {
  const { toasts, removeToast } = useToastStore();
  const { toast: legacyToast, hideToast: hideLegacyToast } = useStore();

  const allToasts = [
    ...(legacyToast ? [{
      id: 'legacy',
      type: 'info',
      message: legacyToast.message,
      action: legacyToast.actionLabel && legacyToast.onAction ? {
        label: legacyToast.actionLabel,
        onClick: legacyToast.onAction
      } : null
    }] : []),
    ...toasts
  ];

  if (allToasts.length === 0) return null;

  return (
    <div 
      aria-live="polite"
      className="fixed top-6 right-4 sm:right-6 z-[100] flex flex-col gap-2 max-w-sm w-[92vw] sm:w-auto pointer-events-none"
    >
      {allToasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-[#0A0A0A] text-white text-xs px-4 py-3 rounded-[4px] shadow-2xl border border-[#222222] flex items-center gap-3 transition-all animate-fadeIn"
        >
          {t.type === 'error' ? (
            <AlertCircle size={16} className="text-red-500 shrink-0" />
          ) : t.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <Info size={16} className="text-[#FF4D00] shrink-0" />
          )}

          <span className="flex-1 text-[#EAEAEA] font-medium leading-tight">
            {t.message}
          </span>

          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action.onClick();
                if (t.id === 'legacy') hideLegacyToast();
                else removeToast(t.id);
              }}
              className="text-[#FF4D00] hover:underline font-semibold uppercase tracking-wider text-[11px] shrink-0"
            >
              {t.action.label}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (t.id === 'legacy') hideLegacyToast();
              else removeToast(t.id);
            }}
            className="text-[#8A8A8A] hover:text-white p-0.5 ml-1 transition-colors"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
