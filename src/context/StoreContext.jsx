import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateWholesaleCart, getWholesaleTier } from '../utils/wholesaleCalculation';

const StoreContext = createContext();

const CART_STORAGE_KEY = 'techbazaar_cart';
const WISHLIST_STORAGE_KEY = 'techbazaar_wishlist';
const RECENT_STORAGE_KEY = 'techbazaar_recent';
const SAVED_CARTS_KEY = 'techbazaar_saved_carts';

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

  // 2. Saved Cart Lists
  const [savedCarts, setSavedCarts] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_CARTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 3. Wishlist state
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 4. Recently viewed products
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 5. Toast notifications
  const [toast, setToast] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_CARTS_KEY, JSON.stringify(savedCarts));
    } catch (e) {}
  }, [savedCarts]);

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

  // Cart operations with Wholesale MOQ awareness
  const addToCart = (product, qty = null, showFeedback = true) => {
    const moq = Number(product.moq || 10);
    const initialQty = qty !== null ? Math.max(1, Number(qty)) : moq;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + (qty !== null ? qty : (product.packSize || 5)) } : item
        );
      }
      return [...prevCart, { ...product, quantity: initialQty }];
    });

    // Trigger cart badge bump animation
    setCartBump(true);
    setTimeout(() => setCartBump(false), 500);

    if (showFeedback) {
      showToast(
        `Added ${initialQty} units of "${product.name.slice(0, 24)}..."`,
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

  // Saved Cart List Management
  const saveCurrentCart = (name = null) => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add products before saving.');
      return;
    }
    const cartName = name || `Wholesale Order (${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})`;
    const newSaved = {
      id: `cart-${Date.now()}`,
      name: cartName,
      createdAt: new Date().toISOString(),
      items: [...cart],
      itemCount: cart.reduce((sum, it) => sum + it.quantity, 0),
      totalValue: cartSummary.subtotal
    };
    setSavedCarts((prev) => [newSaved, ...prev]);
    showToast(`Saved cart list "${cartName}"`, 'View', () => setIsCartOpen(true));
  };

  const loadSavedCart = (savedCartId) => {
    const found = savedCarts.find(c => c.id === savedCartId);
    if (!found) return;
    setCart([...found.items]);
    showToast(`Loaded "${found.name}" with ${found.items.length} items`);
  };

  const deleteSavedCart = (savedCartId) => {
    setSavedCarts((prev) => prev.filter(c => c.id !== savedCartId));
    showToast('Saved cart list removed');
  };

  // Export Cart to CSV
  const exportCartCSV = () => {
    if (cart.length === 0) {
      showToast('Cart is empty.');
      return;
    }
    const headers = ['SKU', 'Product Name', 'Category', 'Quantity', 'Unit Price (INR)', 'Line Total (INR)', 'GST Rate (%)', 'Tax Amount (INR)'];
    const rows = [headers.join(',')];

    for (const item of cartSummary.items) {
      rows.push([
        item.sku || `TB-${(item.category || 'GEN').slice(0, 3).toUpperCase()}`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        item.category || 'Electronics',
        item.quantity,
        item.unitPrice,
        item.lineTotal,
        item.taxRate || 18,
        item.taxAmount || 0
      ].join(','));
    }

    rows.push('');
    rows.push(`"Subtotal",,,,,,"INR ${cartSummary.subtotal}"`);
    rows.push(`"Shipping",,,,,,"INR ${cartSummary.shipping}"`);
    rows.push(`"Total Payable",,,,,,"INR ${cartSummary.total}"`);

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TechBazaar_Wholesale_Cart_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Wholesale cart exported to CSV');
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

  // Wholesale Cart Summary Calculations
  const MIN_ORDER_VALUE = 2500;
  const FREE_SHIPPING_THRESHOLD = 10000;

  const cartSummary = calculateWholesaleCart({
    items: cart,
    minOrderValue: MIN_ORDER_VALUE,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD
  });

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        cartItems: cartSummary.items,
        cartCount,
        cartSubtotal: cartSummary.subtotal,
        cartTotal: cartSummary.total,
        cartSavings: cartSummary.totalSavingsVsMrp,
        shippingFee: cartSummary.shipping,
        taxableValue: cartSummary.totalTaxable,
        totalTax: cartSummary.totalTax,
        
        // MOV & Free shipping progress
        minOrderValue: MIN_ORDER_VALUE,
        meetsMinOrderValue: cartSummary.meetsMinOrderValue,
        amountToMinOrder: cartSummary.amountToMinOrder,
        minOrderProgress: Math.min(100, Math.round((cartSummary.subtotal / MIN_ORDER_VALUE) * 100)),

        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        freeShippingProgress: cartSummary.freeShippingProgress,
        amountToFreeShipping: cartSummary.amountToFreeShipping,
        isFreeShippingMet: cartSummary.subtotal >= FREE_SHIPPING_THRESHOLD,

        // Saved Carts & Export
        savedCarts,
        saveCurrentCart,
        loadSavedCart,
        deleteSavedCart,
        exportCartCSV,

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
