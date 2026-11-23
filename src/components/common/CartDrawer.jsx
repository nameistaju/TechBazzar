import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck, Download, Bookmark, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import BannerSlot from './BannerSlot';

export default function CartDrawer() {
  const { 
    cart, 
    cartItems,
    cartCount, 
    cartSubtotal, 
    shippingFee, 
    cartTotal, 
    freeShippingProgress, 
    amountToFreeShipping, 
    isFreeShippingMet,
    minOrderValue,
    meetsMinOrderValue,
    amountToMinOrder,
    minOrderProgress,
    saveCurrentCart,
    exportCartCSV,
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart 
  } = useStore();

  const [savingCart, setSavingCart] = useState(false);
  const [listName, setListName] = useState('');
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

            {/* Wholesale Minimum Order Value (MOV) & Free Shipping Bars */}
            <div className="space-y-2">
              {/* MOV Status */}
              <div className={`p-2.5 rounded-[4px] border text-xs ${
                meetsMinOrderValue 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-[#FFF9F6] border-[#FF4D00]/30 text-[#0A0A0A]'
              }`}>
                <div className="flex items-center justify-between font-medium mb-1">
                  <span className="flex items-center gap-1.5">
                    {meetsMinOrderValue ? (
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={13} className="text-[#FF4D00]" />
                    )}
                    {meetsMinOrderValue ? (
                      <span>Wholesale Minimum Order Met (₹{minOrderValue.toLocaleString('en-IN')}+)</span>
                    ) : (
                      <span>Add <strong className="text-[#FF4D00] tabular-nums font-bold">₹{amountToMinOrder.toLocaleString('en-IN')}</strong> to meet Wholesale Min Order</span>
                    )}
                  </span>
                  <span className="tabular-nums text-[11px] font-semibold">{minOrderProgress}%</span>
                </div>
                {!meetsMinOrderValue && (
                  <div className="w-full h-1.5 bg-[#EAEAEA] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FF4D00] transition-all duration-300 rounded-full"
                      style={{ width: `${minOrderProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Free Freight Bar */}
              <div className="bg-[#F7F7F7] p-2.5 rounded-[4px] border border-[#EAEAEA]">
                <div className="flex items-center justify-between text-xs mb-1 font-medium">
                  <span className="flex items-center gap-1.5 text-[#0A0A0A]">
                    <Truck size={13} className="text-[#FF4D00]" />
                    {isFreeShippingMet ? (
                      <span className="text-emerald-600 font-semibold">FREE Bulk Freight Unlocked!</span>
                    ) : (
                      <span>Add <strong className="text-[#0A0A0A] tabular-nums font-semibold">₹{amountToFreeShipping.toLocaleString('en-IN')}</strong> for Free Pallet Shipping</span>
                    )}
                  </span>
                  <span className="text-[11px] text-[#6B6B6B] tabular-nums">{freeShippingProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#EAEAEA] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Slot 5: cart-promo Banner */}
            <BannerSlot slot="cart-promo" className="mb-2" />

            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 py-12">
                <div className="w-16 h-16 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#9E9E9E] mb-4">
                  <ShoppingBag size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">Your wholesale cart is empty</h3>
                <p className="text-xs text-[#6B6B6B] max-w-[240px] leading-relaxed mb-6">
                  Explore bulk cables, smart chargers, audio tiers, and gadgets ready for pallet dispatch.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/shop');
                  }}
                  className="bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-[4px] hover:bg-[#FF4D00] transition-colors"
                >
                  Explore Wholesale Catalog
                </button>
              </div>
            ) : (
              (cartItems || cart).map((item) => (
                <div key={item.id} className="p-3 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] flex gap-3 group">
                  <div className="w-16 h-16 bg-white border border-[#EAEAEA] rounded-[3px] p-1.5 shrink-0 flex items-center justify-center">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-[#6B6B6B] font-medium truncate">
                          {item.brand} • <strong className="text-[#0A0A0A]">Tier {item.tierApplied || 1}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#9E9E9E] hover:text-red-500 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <Link
                        to={`/product/${item.id}`}
                        onClick={() => setIsCartOpen(false)}
                        className="text-xs font-medium text-[#0A0A0A] hover:text-[#FF4D00] line-clamp-1 transition-colors mt-0.5"
                      >
                        {item.name}
                      </Link>
                      <div className="text-[10px] text-[#8A8A8A]">
                        @ ₹{(item.unitPrice || item.price).toLocaleString('en-IN')}/unit (MOQ {item.moq || 10})
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#EAEAEA]">
                      <div className="flex items-center border border-[#EAEAEA] rounded bg-white h-6">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, Math.max(item.moq || 1, item.quantity - (item.packSize || 5)))}
                          disabled={item.quantity <= (item.moq || 1)}
                          className="px-1.5 h-full hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors disabled:opacity-30"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="px-2 text-xs font-semibold tabular-nums text-[#0A0A0A]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + (item.packSize || 5))}
                          className="px-1.5 h-full hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">
                          ₹{(item.lineTotal || (item.price * item.quantity)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary & B2B Actions */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-[#EAEAEA] bg-[#FAFAFA]">
              {/* B2B Cart Utilities Strip */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EAEAEA] text-[11px] text-[#6B6B6B]">
                <button
                  type="button"
                  onClick={() => saveCurrentCart()}
                  className="hover:text-[#0A0A0A] flex items-center gap-1 transition-colors"
                  title="Save current cart list"
                >
                  <Bookmark size={12} className="text-[#FF4D00]" /> Save List
                </button>
                <button
                  type="button"
                  onClick={exportCartCSV}
                  className="hover:text-[#0A0A0A] flex items-center gap-1 transition-colors"
                  title="Export to CSV"
                >
                  <Download size={12} /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/quote');
                  }}
                  className="hover:text-[#FF4D00] flex items-center gap-1 transition-colors font-medium"
                >
                  <FileText size={12} /> Request Quote
                </button>
              </div>

              <div className="space-y-1.5 mb-3 text-xs">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Wholesale Subtotal</span>
                  <span className="font-semibold text-[#0A0A0A] tabular-nums">₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Bulk Freight</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 font-medium uppercase tracking-wider text-[11px]">Free</span>
                    ) : (
                      <span className="tabular-nums">₹{shippingFee}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#0A0A0A] pt-1.5 border-t border-[#EAEAEA]">
                  <span>Estimated Total</span>
                  <span className="tabular-nums text-base text-[#FF4D00]">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!meetsMinOrderValue}
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className={`w-full text-xs font-semibold uppercase tracking-widest py-3.5 rounded-[4px] transition-all flex items-center justify-center gap-2 group shadow-sm ${
                    meetsMinOrderValue
                      ? 'bg-[#0A0A0A] text-white hover:bg-[#FF4D00] cursor-pointer'
                      : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  {meetsMinOrderValue ? (
                    <>
                      Wholesale Checkout <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <span>Min Order ₹{minOrderValue.toLocaleString('en-IN')} Required</span>
                  )}
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

              <div className="mt-3 pt-2 border-t border-[#EAEAEA] flex items-center justify-center gap-1.5 text-[10px] text-[#8A8A8A]">
                <ShieldCheck size={12} className="text-emerald-600" /> GST Tax Invoice Included • 100% Genuine Hardware
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
