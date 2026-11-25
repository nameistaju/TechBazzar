// src/context/StoreContext.jsx
// Dual Cart Coordinator for TechBazaar:
// - RETAIL CART: B2C, single-unit, guest-first, no login required, stored in localStorage['techbazaar_retail_cart']
// - WHOLESALE CART: B2B, MOQ, tier pricing, group discounts, credit terms, synced to /api/wholesale/cart
// Items never mix. Switching mode keeps both carts intact.

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { calculateRetailCart, calculateWholesaleCart } from '@shared/utils/wholesaleCalculation';
import useAuthStore from '@shared/store/authStore';

const StoreContext = createContext();

const MODE_STORAGE_KEY = 'techbazaar_mode';
const RETAIL_CART_KEY = 'techbazaar_retail_cart';
const WHOLESALE_CART_KEY = 'techbazaar_wholesale_cart';
const WISHLIST_STORAGE_KEY = 'techbazaar_wishlist';
const RECENT_STORAGE_KEY = 'techbazaar_recent';
const SAVED_CARTS_KEY = 'techbazaar_saved_carts';

export function StoreProvider({ children }) {
  const { user, isAuthenticated } = useAuthStore();

  // 1. Mode State ('retail' | 'wholesale')
  const [mode, setModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      return saved === 'wholesale' ? 'wholesale' : 'retail';
    } catch {
      return 'retail';
    }
  });

  // Wholesale access sheet modal state
  const [isWholesaleSheetOpen, setIsWholesaleSheetOpen] = useState(false);
  const [wholesaleSheetTab, setWholesaleSheetTab] = useState('apply'); // 'apply' | 'login'

  // 2. Retail Cart State (localStorage for guest-first)
  const [retailCart, setRetailCart] = useState(() => {
    try {
      const saved = localStorage.getItem(RETAIL_CART_KEY);
      if (saved) return JSON.parse(saved);
      // Migrate legacy cart if present
      const legacy = localStorage.getItem('techbazaar_cart');
      return legacy ? JSON.parse(legacy) : [];
    } catch {
      return [];
    }
  });

  // 3. Wholesale Cart State
  const [wholesaleCart, setWholesaleCart] = useState(() => {
    try {
      const saved = localStorage.getItem(WHOLESALE_CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // 4. Saved Cart Lists
  const [savedCarts, setSavedCarts] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_CARTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 5. Wishlist state
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 6. Recently viewed products
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 7. Toast notifications
  const [toast, setToast] = useState(null);

  // Sync mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  // Sync retail cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(RETAIL_CART_KEY, JSON.stringify(retailCart));
    } catch {}
  }, [retailCart]);

  // Sync wholesale cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WHOLESALE_CART_KEY, JSON.stringify(wholesaleCart));
    } catch {}
  }, [wholesaleCart]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_CARTS_KEY, JSON.stringify(savedCarts));
    } catch {}
  }, [savedCarts]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentlyViewed));
    } catch {}
  }, [recentlyViewed]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message, actionLabel = null, onAction = null) => {
    setToast({
      id: Date.now(),
      message,
      actionLabel,
      onAction
    });
  };

  const hideToast = () => setToast(null);

  // Load Wholesale Cart from server when authenticated approved buyer
  const isApprovedWholesaleUser = Boolean(
    isAuthenticated && 
    user && 
    (user.role === 'admin' || (user.buyerType === 'wholesale' && user.wholesaleStatus === 'approved'))
  );

  useEffect(() => {
    if (isApprovedWholesaleUser && mode === 'wholesale') {
      fetch('/api/wholesale/cart')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.data?.items) {
            setWholesaleCart(data.data.items);
          }
        })
        .catch(() => {});
    }
  }, [isApprovedWholesaleUser, mode]);

  // If user is NOT approved wholesale, ensure they don't stay stuck in wholesale mode
  useEffect(() => {
    if (mode === 'wholesale' && !isApprovedWholesaleUser) {
      setModeState('retail');
    }
  }, [isApprovedWholesaleUser, mode]);

  // ==========================================
  // MODE SWITCHER (The Core UX Element)
  // ==========================================
  const switchMode = (targetMode) => {
    if (targetMode === mode) return;

    if (targetMode === 'wholesale') {
      if (isApprovedWholesaleUser) {
        setModeState('wholesale');
        showToast(
          `Switched to Wholesale. Your retail cart (${retailCart.length} item${retailCart.length === 1 ? '' : 's'}) is saved.`
        );
      } else {
        // Not approved or not signed in: open friendly side sheet
        setWholesaleSheetTab(isAuthenticated ? 'apply' : 'login');
        setIsWholesaleSheetOpen(true);
      }
    } else {
      // Switching to Retail
      setModeState('retail');
      showToast(
        `Switched to Retail. Your wholesale cart (${wholesaleCart.length} item${wholesaleCart.length === 1 ? '' : 's'}) is saved.`
      );
    }
  };

  const setModeDirect = (newMode) => {
    setModeState(newMode);
  };

  const openWholesaleSheet = (tab = 'apply') => {
    setWholesaleSheetTab(tab);
    setIsWholesaleSheetOpen(true);
  };

  const closeWholesaleSheet = () => {
    setIsWholesaleSheetOpen(false);
  };

  // ==========================================
  // RETAIL CART OPERATIONS
  // ==========================================
  const addToRetailCart = (product, qty = 1, showFeedback = true) => {
    const addQty = Math.max(1, Number(qty) || 1);
    setRetailCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + addQty } : item
        );
      }
      return [...prev, { ...product, quantity: addQty }];
    });

    setCartBump(true);
    setTimeout(() => setCartBump(false), 500);

    if (showFeedback) {
      showToast(
        `Added "${product.name.slice(0, 24)}..." to retail cart`,
        'View Cart',
        () => setIsCartOpen(true)
      );
    }
  };

  const removeFromRetailCart = (productId) => {
    const itemToRemove = retailCart.find(item => item.id === productId);
    setRetailCart((prev) => prev.filter((item) => item.id !== productId));

    if (itemToRemove) {
      showToast(
        `Removed "${itemToRemove.name.slice(0, 24)}..."`,
        'Undo',
        () => setRetailCart(prev => [...prev, itemToRemove])
      );
    }
  };

  const updateRetailQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromRetailCart(productId);
      return;
    }
    setRetailCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity: newQty } : item))
    );
  };

  const clearRetailCart = () => setRetailCart([]);

  // ==========================================
  // WHOLESALE CART OPERATIONS
  // ==========================================
  const addToWholesaleCart = (product, qty = null, showFeedback = true) => {
    const moq = Number(product.moq || 10);
    const initialQty = qty !== null ? Math.max(1, Number(qty)) : moq;

    // Server-sync if authenticated wholesale buyer
    if (isApprovedWholesaleUser) {
      fetch('/api/wholesale/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: initialQty })
      }).then(r => r.json()).then(data => {
        if (data?.data?.items) setWholesaleCart(data.data.items);
      }).catch(() => {});
    }

    setWholesaleCart((prev) => {
      const existing = prev.find((item) => (item.id || item.product_id) === product.id);
      if (existing) {
        const pack = Number(product.pack_size || 5);
        return prev.map((item) =>
          (item.id || item.product_id) === product.id 
            ? { ...item, quantity: item.quantity + (qty !== null ? qty : pack) } 
            : item
        );
      }
      return [...prev, { ...product, quantity: initialQty }];
    });

    setCartBump(true);
    setTimeout(() => setCartBump(false), 500);

    if (showFeedback) {
      showToast(
        `Added ${initialQty} units of "${product.name.slice(0, 24)}..." to wholesale cart`,
        'View Cart',
        () => setIsCartOpen(true)
      );
    }
  };

  const removeFromWholesaleCart = (productId) => {
    const itemToRemove = wholesaleCart.find(item => (item.id || item.product_id) === productId);
    setWholesaleCart((prev) => prev.filter((item) => (item.id || item.product_id) !== productId));

    if (isApprovedWholesaleUser) {
      fetch(`/api/wholesale/cart/${productId}`, { method: 'DELETE' }).catch(() => {});
    }

    if (itemToRemove) {
      showToast(
        `Removed "${itemToRemove.name.slice(0, 24)}..."`,
        'Undo',
        () => {
          setWholesaleCart(prev => [...prev, itemToRemove]);
          if (isApprovedWholesaleUser) {
            fetch('/api/wholesale/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId, quantity: itemToRemove.quantity })
            }).catch(() => {});
          }
        }
      );
    }
  };

  const updateWholesaleQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromWholesaleCart(productId);
      return;
    }
    setWholesaleCart((prev) =>
      prev.map((item) => ((item.id || item.product_id) === productId ? { ...item, quantity: newQty } : item))
    );

    if (isApprovedWholesaleUser) {
      fetch(`/api/wholesale/cart/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      }).catch(() => {});
    }
  };

  const clearWholesaleCart = () => {
    setWholesaleCart([]);
    if (isApprovedWholesaleUser) {
      fetch('/api/wholesale/cart', { method: 'DELETE' }).catch(() => {});
    }
  };

  // ==========================================
  // ACTIVE CART FACADE (Routes automatically by mode)
  // ==========================================
  const activeCartItems = mode === 'wholesale' ? wholesaleCart : retailCart;
  const activeCartCount = activeCartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const otherCartCount = mode === 'wholesale' 
    ? retailCart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
    : wholesaleCart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  const addToCart = (product, qty = null, showFeedback = true) => {
    if (mode === 'wholesale') {
      addToWholesaleCart(product, qty, showFeedback);
    } else {
      addToRetailCart(product, qty !== null ? qty : 1, showFeedback);
    }
  };

  const removeFromCart = (productId) => {
    if (mode === 'wholesale') {
      removeFromWholesaleCart(productId);
    } else {
      removeFromRetailCart(productId);
    }
  };

  const updateQuantity = (productId, newQty) => {
    if (mode === 'wholesale') {
      updateWholesaleQuantity(productId, newQty);
    } else {
      updateRetailQuantity(productId, newQty);
    }
  };

  const clearCart = () => {
    setAppliedCoupon(null);
    if (mode === 'wholesale') {
      clearWholesaleCart();
    } else {
      clearRetailCart();
    }
  };

  // Cart Calculations
  const wholesaleSummary = useMemo(() => {
    const userGroup = user?.groupId ? {
      id: user.groupId,
      name: user.groupName,
      extra_discount_percent: user.extraDiscountPercent || 0,
      credit_limit: user.creditLimit || 0,
      payment_terms: user.paymentTerms || 'prepaid'
    } : null;

    return calculateWholesaleCart({
      items: wholesaleCart,
      user,
      group: userGroup,
      discount: appliedCoupon,
      minOrderValue: 250000,
      freeShippingThreshold: 1000000
    });
  }, [wholesaleCart, user, appliedCoupon]);

  const retailSummary = useMemo(() => {
    return calculateRetailCart({
      items: retailCart,
      discount: appliedCoupon,
      freeShippingThreshold: 149900,
      shippingFee: 9900
    });
  }, [retailCart, appliedCoupon]);

  const activeCartSummary = mode === 'wholesale' ? wholesaleSummary : retailSummary;

  // Saved Cart List Management
  const saveCurrentCart = (name = null) => {
    if (activeCartItems.length === 0) {
      showToast('Cart is empty. Add products before saving.');
      return;
    }
    const cartName = name || `${mode === 'wholesale' ? 'Wholesale Bulk' : 'Retail'} Order (${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})`;
    const newSaved = {
      id: `cart-${Date.now()}`,
      name: cartName,
      mode,
      createdAt: new Date().toISOString(),
      items: [...activeCartItems],
      itemCount: activeCartCount,
      totalValue: activeCartSummary.subtotal
    };
    setSavedCarts((prev) => [newSaved, ...prev]);
    showToast(`Saved cart list "${cartName}"`, 'View', () => setIsCartOpen(true));
  };

  const loadSavedCart = (savedCartId) => {
    const found = savedCarts.find(c => c.id === savedCartId);
    if (!found) return;
    if (found.mode === 'wholesale') {
      setWholesaleCart([...found.items]);
      setModeState('wholesale');
    } else {
      setRetailCart([...found.items]);
      setModeState('retail');
    }
    showToast(`Loaded "${found.name}" with ${found.items.length} items`);
  };

  const deleteSavedCart = (savedCartId) => {
    setSavedCarts((prev) => prev.filter(c => c.id !== savedCartId));
    showToast('Saved cart list removed');
  };

  // Export Cart to CSV
  const exportCartCSV = () => {
    if (activeCartItems.length === 0) {
      showToast('Cart is empty.');
      return;
    }
    const headers = ['SKU', 'Product Name', 'Category', 'Quantity', 'Unit Price (INR)', 'Line Total (INR)'];
    const rows = [headers.join(',')];

    for (const item of activeCartSummary.items) {
      rows.push([
        item.sku || `TB-${(item.category || 'GEN').slice(0, 3).toUpperCase()}`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        item.category || 'Electronics',
        item.quantity,
        item.unitPrice,
        item.lineTotal
      ].join(','));
    }

    rows.push('');
    rows.push(`"Subtotal",,,,"INR ${activeCartSummary.subtotal}"`);
    rows.push(`"Shipping",,,,"INR ${activeCartSummary.shipping}"`);
    rows.push(`"Total Payable",,,,"INR ${activeCartSummary.total}"`);

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TechBazaar_${mode.toUpperCase()}_Cart_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Cart exported to CSV');
  };

  // Wishlist operations
  const toggleWishlist = (product) => {
    const exists = wishlist.some((item) => item.id === product.id);
    if (exists) {
      setWishlist((prev) => prev.filter((item) => item.id !== product.id));
      showToast(`Removed from Wishlist`);
    } else {
      setWishlist((prev) => [...prev, product]);
      showToast(`Saved to Wishlist`, 'View Wishlist', () => {
        window.location.href = '/wishlist';
      });
    }
  };

  const isInWishlist = (productId) => wishlist.some((item) => item.id === productId);
  const removeFromWishlist = (productId) => setWishlist((prev) => prev.filter((item) => item.id !== productId));

  const recordViewedProduct = (product) => {
    if (!product || !product.id) return;
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      return [product, ...filtered].slice(0, 8);
    });
  };

  return (
    <StoreContext.Provider
      value={{
        // Mode State
        mode,
        isWholesale: mode === 'wholesale',
        isRetail: mode === 'retail',
        switchMode,
        setModeDirect,
        isApprovedWholesaleUser,
        wholesaleBuyer: user?.buyerType === 'wholesale' ? user : null,

        // Modal Sheet
        isWholesaleSheetOpen,
        wholesaleSheetTab,
        openWholesaleSheet,
        closeWholesaleSheet,

        // Active Cart facade
        cart: activeCartItems,
        cartItems: activeCartSummary.items,
        cartCount: activeCartCount,
        otherCartCount,
        cartSubtotal: activeCartSummary.subtotal,
        cartTotal: activeCartSummary.total,
        cartSavings: activeCartSummary.totalSavingsVsMrp,
        cartSavingsVsRetail: activeCartSummary.totalSavingsVsRetail || 0,
        shippingFee: activeCartSummary.shipping,
        taxableValue: activeCartSummary.taxableValue,
        totalTax: activeCartSummary.totalTax || 0,
        groupDiscountTotal: activeCartSummary.groupDiscountTotal || 0,
        volumeDiscountAmount: activeCartSummary.volumeDiscountAmount || 0,
        volumeDiscountPercent: activeCartSummary.volumeDiscountPercent || 0,
        couponDiscountAmount: activeCartSummary.couponDiscountAmount || activeCartSummary.discountAmount || 0,
        appliedCoupon,
        setAppliedCoupon,

        // Wholesale specific MOV & threshold
        minOrderValue: activeCartSummary.minOrderValue ?? 250000,
        meetsMinOrderValue: activeCartSummary.meetsMinOrderValue !== undefined ? activeCartSummary.meetsMinOrderValue : true,
        amountToMinOrder: activeCartSummary.amountToMinOrder || 0,
        hasMoqViolations: Boolean(activeCartSummary.hasMoqViolations),

        freeShippingThreshold: activeCartSummary.freeShippingThreshold,
        freeShippingProgress: activeCartSummary.freeShippingProgress,
        amountToFreeShipping: activeCartSummary.amountToFreeShipping,
        isFreeShippingMet: activeCartSummary.isFreeShippingMet,

        // Distinct Carts
        retailCart,
        wholesaleCart,
        addToRetailCart,
        addToWholesaleCart,

        // Cart Actions
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartBump,

        // Saved Carts & Export
        savedCarts,
        saveCurrentCart,
        loadSavedCart,
        deleteSavedCart,
        exportCartCSV,

        // Wishlist & Recent
        wishlist,
        wishlistCount: wishlist.length,
        toggleWishlist,
        isInWishlist,
        removeFromWishlist,
        recentlyViewed,
        recordViewedProduct,

        // Toast
        toast,
        showToast,
        hideToast
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
