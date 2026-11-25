import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: (firstArg, typeArg = 'info', opts = {}) => {
    let type = 'info';
    let message = '';
    let action = null;
    let duration = 4000;

    if (typeof firstArg === 'string') {
      message = firstArg;
      if (typeof typeArg === 'string') {
        type = typeArg;
      }
      if (typeof typeArg === 'object' && typeArg !== null) {
        action = typeArg.action || null;
        duration = typeArg.duration ?? 4000;
      } else if (typeof opts === 'object' && opts !== null) {
        action = opts.action || null;
        duration = opts.duration ?? 4000;
      }
    } else if (typeof firstArg === 'object' && firstArg !== null) {
      type = firstArg.type || 'info';
      message = firstArg.message || '';
      action = firstArg.action || null;
      duration = firstArg.duration ?? 4000;
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = { id, type, message, action, duration };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast] // Keep max 5 stacked toasts
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  showUndoToast: (message, undoAction, duration = 5000) => {
    return get().addToast({
      type: 'info',
      message,
      duration,
      action: {
        label: 'Undo',
        onClick: undoAction
      }
    });
  }
}));

export const toast = {
  success: (msg, opts) => useToastStore.getState().addToast({ type: 'success', message: msg, ...opts }),
  error: (msg, opts) => useToastStore.getState().addToast({ type: 'error', message: msg, ...opts }),
  info: (msg, opts) => useToastStore.getState().addToast({ type: 'info', message: msg, ...opts }),
  undo: (msg, undoFn) => useToastStore.getState().showUndoToast(msg, undoFn)
};

export default useToastStore;
