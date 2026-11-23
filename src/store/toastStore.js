import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: ({ type = 'info', message, action = null, duration = 4000 }) => {
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
