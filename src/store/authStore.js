import { create } from 'zustand';
import authApi from '../api/authApi';
import cartApi from '../api/cartApi';
import { useToastStore } from './toastStore';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthModalOpen: false,
  authModalTab: 'login', // 'login' | 'register'
  pendingGuestOrder: null,

  openAuthModal: (tab = 'login', pendingOrder = null) => {
    set({
      isAuthModalOpen: true,
      authModalTab: tab,
      pendingGuestOrder: pendingOrder
    });
  },

  closeAuthModal: () => {
    set({
      isAuthModalOpen: false,
      pendingGuestOrder: null
    });
  },

  setAuthModalTab: (tab) => set({ authModalTab: tab }),

  checkAuth: async () => {
    set({ isLoading: true });
    const res = await authApi.getMe();
    if (res.data?.user) {
      set({
        user: res.data.user,
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },

  login: async (email, password, localCartItems = [], localWishlistIds = []) => {
    set({ isLoading: true });
    const res = await authApi.login({ email, password });

    if (res.error) {
      set({ isLoading: false });
      return { success: false, error: res.error };
    }

    const loggedUser = res.data.user;
    set({
      user: loggedUser,
      isAuthenticated: true,
      isLoading: false,
      isAuthModalOpen: false
    });

    const addToast = useToastStore.getState().addToast;
    addToast({
      type: 'success',
      message: `Welcome back, ${loggedUser.name.split(' ')[0]}!`
    });

    // Auto-sync local cart if items exist
    if (localCartItems && localCartItems.length > 0) {
      const syncPayload = localCartItems.map(i => ({
        productId: i.product.id,
        quantity: i.quantity
      }));
      cartApi.syncCart(syncPayload).then(() => {
        addToast({
          type: 'info',
          message: `${localCartItems.length} items from your cart were saved to your account.`
        });
      }).catch(() => {});
    }

    // Auto-sync wishlist
    if (localWishlistIds && localWishlistIds.length > 0) {
      cartApi.syncWishlist(localWishlistIds).catch(() => {});
    }

    return { success: true, user: loggedUser };
  },

  register: async (name, email, password, guestOrderNumber = null) => {
    set({ isLoading: true });
    const res = await authApi.register({ name, email, password, guestOrderNumber });

    if (res.error) {
      set({ isLoading: false });
      return { success: false, error: res.error };
    }

    const newUser = res.data.user;
    set({
      user: newUser,
      isAuthenticated: true,
      isLoading: false,
      isAuthModalOpen: false,
      pendingGuestOrder: null
    });

    const addToast = useToastStore.getState().addToast;
    addToast({
      type: 'success',
      message: res.data.claimedOrder 
        ? 'Account created! Your recent order has been linked to your account.'
        : `Welcome to TechBazaar, ${newUser.name.split(' ')[0]}!`
    });

    return { success: true, user: newUser, claimedOrder: res.data.claimedOrder };
  },

  logout: async () => {
    set({ isLoading: true });
    await authApi.logout();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });

    useToastStore.getState().addToast({
      type: 'info',
      message: 'You have been signed out.'
    });
  }
}));

export default useAuthStore;
