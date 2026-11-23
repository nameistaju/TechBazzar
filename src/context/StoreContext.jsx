import React, { createContext, useContext, useState, useEffect } from 'react';

const StoreContext = createContext();

const CART_STORAGE_KEY = 'techbazaar_cart';
const WISHLIST_STORAGE_KEY = 'techbazaar_wishlist';
const RECENT_STORAGE_KEY = 'techbazaar_recent';

export function StoreProvider({ children }) {
  // 1. Cart state
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);

  // 2. Wishlist state
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 3. Recently viewed products
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 4. Toast notifications
  const [toast, setToast] = useState(null); // { id, message, type: 'info'|'cart'|'wishlist', actionLabel, onAction }

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {}
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentlyViewed));
    } catch (e) {}
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

  // Cart operations
  const addToCart = (product, qty = 1, showFeedback = true) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prevCart, { ...product, quantity: qty }];
    });

    // Trigger cart badge bump animation
    setCartBump(true);
    setTimeout(() => setCartBump(false), 500);

    if (showFeedback) {
      showToast(
        `Added "${product.name.slice(0, 28)}..." to cart`,
        'View Cart',
        () => setIsCartOpen(true)
      );
    }
  };

  const removeFromCart = (productId) => {
    const itemToRemove = cart.find(item => item.id === productId);
    setCart((prev) => prev.filter((item) => item.id !== productId));

    if (itemToRemove) {
      showToast(
        `Removed "${itemToRemove.name.slice(0, 24)}..."`,
        'Undo',
        () => {
          setCart(prev => [...prev, itemToRemove]);
        }
      );
    }
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity: newQty } : item))
    );
  };

  const clearCart = () => setCart([]);

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

  const isInWishlist = (productId) => {
    return wishlist.some((item) => item.id === productId);
  };

  const removeFromWishlist = (productId) => {
    setWishlist((prev) => prev.filter((item) => item.id !== productId));
  };

  // Add to recently viewed
  const recordViewedProduct = (product) => {
    if (!product || !product.id) return;
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      return [product, ...filtered].slice(0, 8);
    });
  };

  // Calculations
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartOriginalTotal = cart.reduce((sum, item) => sum + (item.originalPrice || item.price) * item.quantity, 0);
  const cartSavings = Math.max(0, cartOriginalTotal - cartSubtotal);

  const FREE_SHIPPING_THRESHOLD = 999;
  const shippingFee = cartSubtotal >= FREE_SHIPPING_THRESHOLD || cartSubtotal === 0 ? 0 : 99;
  const cartTotal = cartSubtotal + shippingFee;
  const freeShippingProgress = Math.min(100, Math.round((cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartSubtotal);

  return (
    <StoreContext.Provider
      value={{
        cart,
        cartCount,
        cartSubtotal,
        cartOriginalTotal,
        cartSavings,
        shippingFee,
        cartTotal,
        freeShippingProgress,
        amountToFreeShipping,
        isCartOpen,
        setIsCartOpen,
        cartBump,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,

        wishlist,
        wishlistCount: wishlist.length,
        toggleWishlist,
        isInWishlist,
        removeFromWishlist,

        recentlyViewed,
        recordViewedProduct,

        toast,
        showToast,
        hideToast,
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
