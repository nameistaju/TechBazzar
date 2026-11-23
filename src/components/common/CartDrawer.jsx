import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export default function CartDrawer() {
  const { 
    cart, 
    cartCount, 
    cartSubtotal, 
    shippingFee, 
    cartTotal, 
    freeShippingProgress, 
    amountToFreeShipping, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart 
  } = useStore();

  const drawerRef = useRef(null);
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCartOpen) {
        setIsCartOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          ref={drawerRef}
          className="w-screen max-w-md bg-white border-l border-[#EAEAEA] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#EAEAEA]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#FF4D00]" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">
                  Shopping Bag ({cartCount})
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-full transition-colors"
                aria-label="Close cart drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Free Shipping Progress Bar */}
            <div className="bg-[#F7F7F7] p-3 rounded-[4px] border border-[#EAEAEA]">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="flex items-center gap-1.5 text-[#0A0A0A]">
                  <Truck size={14} className="text-[#FF4D00]" />
                  {amountToFreeShipping === 0 ? (
                    <span className="text-emerald-600 font-semibold">You've unlocked FREE Express Shipping!</span>
                  ) : (
                    <span>Add <strong className="text-[#0A0A0A] tabular-nums font-semibold">₹{amountToFreeShipping.toLocaleString('en-IN')}</strong> for FREE Shipping</span>
                  )}
                </span>
                <span className="text-[11px] text-[#6B6B6B] tabular-nums">{freeShippingProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#EAEAEA] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#FF4D00] transition-all duration-500 rounded-full"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 divide-y divide-[#F2F2F2]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#9E9E9E] mb-4">
                  <ShoppingBag size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">Your bag is empty</h3>
                <p className="text-xs text-[#6B6B6B] max-w-[240px] leading-relaxed mb-6">
                  Explore curated headphones, smartwatches, and minimalist gadgets ready for express dispatch.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/shop');
                  }}
                  className="bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-[4px] hover:bg-[#FF4D00] transition-colors"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-4 flex gap-4 group">
                  <div className="w-20 h-20 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-2 shrink-0 flex items-center justify-center">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-medium truncate">
                          {item.brand}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#9E9E9E] hover:text-red-500 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <Link
                        to={`/product/${item.id}`}
                        onClick={() => setIsCartOpen(false)}
                        className="text-xs font-medium text-[#0A0A0A] hover:text-[#FF4D00] line-clamp-1 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-[#EAEAEA] rounded-[4px] bg-[#FAFAFA]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-[#EAEAEA] text-[#0A0A0A] transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2.5 text-xs font-semibold tabular-nums text-[#0A0A0A]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-[#EAEAEA] text-[#0A0A0A] transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <div className="text-[10px] text-[#8A8A8A] line-through tabular-nums">
                            ₹{(item.originalPrice * item.quantity).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-[#EAEAEA] bg-[#FAFAFA]">
              <div className="space-y-2 mb-4 text-xs">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#0A0A0A] tabular-nums">₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Estimated Shipping</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 font-medium uppercase tracking-wider text-[11px]">Free</span>
                    ) : (
                      <span className="tabular-nums">₹{shippingFee}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-[#0A0A0A] pt-2 border-t border-[#EAEAEA]">
                  <span>Total</span>
                  <span className="tabular-nums text-base">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className="w-full bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest py-3.5 rounded-[4px] hover:bg-[#FF4D00] transition-colors flex items-center justify-center gap-2 group shadow-sm"
                >
                  Checkout Now <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="text-center">
                  <Link
                    to="/cart"
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-4"
                  >
                    View and Edit Full Cart
                  </Link>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EAEAEA] flex items-center justify-center gap-1.5 text-[11px] text-[#8A8A8A]">
                <ShieldCheck size={13} className="text-emerald-600" /> 256-Bit SSL Encrypted Checkout
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
