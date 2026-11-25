import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMoney } from '@shared/utils/formatters';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ShoppingBag, 
  Truck, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { useStore } from '@app/providers/StoreContext';
import BannerSlot from '@shared/ui/BannerSlot';
import CartDrawerFooter from '@features/cart/components/CartDrawerFooter';

export default function CartDrawer() {
  const { 
    mode,
    switchMode,
    cart, 
    cartItems,
    cartCount, 
    cartSubtotal, 
    cartSavings,
    cartSavingsVsRetail,
    groupDiscountTotal,
    shippingFee, 
    cartTotal, 
    freeShippingProgress, 
    amountToFreeShipping, 
    isFreeShippingMet,
    minOrderValue,
    meetsMinOrderValue,
    amountToMinOrder,
    hasMoqViolations,
    saveCurrentCart,
    exportCartCSV,
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

  const isWholesale = mode === 'wholesale';
  const displayItems = cartItems || cart;

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
          <div className="p-5 border-b border-[#EAEAEA]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-accent-text" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-[#0A0A0A] flex items-center gap-1.5">
                  {isWholesale ? 'Wholesale Procurement Bag' : 'Shopping Bag'}
                  <span className="text-xs text-[#8A8A8A] font-normal">({cartCount})</span>
                </h2>
                {isWholesale && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0A0A0A] text-accent-text border border-accent/40">
                    B2B
                  </span>
                )}
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

            {/* Threshold bars */}
            {isWholesale ? (
              <div className="space-y-2">
                {/* Wholesale MOV Status */}
                <div className={`p-2 rounded-[4px] border text-xs ${
                  meetsMinOrderValue 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-[#FFF9F6] border-accent/30 text-[#0A0A0A]'
                }`}>
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      {meetsMinOrderValue ? (
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle size={13} className="text-accent-text shrink-0" />
                      )}
                      {meetsMinOrderValue ? (
                        <span>Wholesale Min Order Met ({formatMoney(minOrderValue ?? 250000)}+)</span>
                      ) : (
                        <span>Add <strong className="text-accent-text tabular-nums font-bold">{formatMoney(amountToMinOrder || 0)}</strong> to meet Min Order Value</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Free Freight Bar */}
                <div className="bg-[#F7F7F7] p-2 rounded-[4px] border border-[#EAEAEA]">
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="flex items-center gap-1.5 text-[#0A0A0A] text-[11px]">
                      <Truck size={13} className="text-accent-text shrink-0" />
                      {isFreeShippingMet ? (
                        <span className="text-emerald-700 font-semibold">FREE Bulk Freight Unlocked!</span>
                      ) : (
                        <span>Add <strong className="tabular-nums font-semibold">{formatMoney(amountToFreeShipping || 0)}</strong> for Free Freight</span>
                      )}
                    </span>
                    <span className="text-[10px] text-[#6B6B6B] tabular-nums">{freeShippingProgress || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EAEAEA] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                      style={{ width: `${freeShippingProgress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Retail Free Shipping Bar (Free over ₹1,499) */
              <div className="bg-[#F7F7F7] p-2 rounded-[4px] border border-[#EAEAEA]">
                <div className="flex items-center justify-between text-xs font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-[#0A0A0A] text-[11px]">
                    <Truck size={13} className="text-accent-text shrink-0" />
                    {isFreeShippingMet ? (
                      <span className="text-emerald-700 font-semibold">FREE Standard Delivery Unlocked!</span>
                    ) : (
                      <span>Add <strong className="tabular-nums font-semibold">{formatMoney(amountToFreeShipping || 0)}</strong> for Free Delivery</span>
                    )}
                  </span>
                  <span className="text-[10px] text-[#6B6B6B] tabular-nums">{freeShippingProgress || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#EAEAEA] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#0A0A0A] transition-all duration-300 rounded-full"
                    style={{ width: `${freeShippingProgress || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Subtle Switch Prompt */}
            {!isWholesale && (
              <div className="mt-2.5 pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-[11px] text-[#6B6B6B]">
                <span>Buying for business or bulk resale?</span>
                <button
                  type="button"
                  onClick={() => switchMode('wholesale')}
                  className="text-accent-text hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  Switch to Wholesale <ArrowRight size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <BannerSlot slot="cart-promo" className="mb-2" />

            {displayItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 py-12">
                <div className="w-16 h-16 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#9E9E9E] mb-4">
                  <ShoppingBag size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">
                  {isWholesale ? 'Your wholesale cart is empty' : 'Your shopping bag is empty'}
                </h3>
                <p className="text-xs text-[#6B6B6B] max-w-[240px] leading-relaxed mb-6">
                  {isWholesale 
                    ? 'Explore bulk audio, high-speed cables, cases, and charging hubs.' 
                    : 'Discover wireless audio, luxury smartwatches, phone cases, and fast chargers.'
                  }
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/shop');
                  }}
                  className="bg-[#0A0A0A] text-accent-contrast text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-[4px] hover:bg-accent transition-colors cursor-pointer"
                >
                  {isWholesale ? 'Explore Wholesale Catalog' : 'Start Shopping'}
                </button>
              </div>
            ) : (
              displayItems.map((item) => {
                const moq = isWholesale ? (item.moq || 10) : 1;
                const packStep = isWholesale ? (item.packSize || item.stepQuantity || 5) : 1;
                const isBelowMoq = isWholesale && item.quantity < moq;

                return (
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
                            {item.brand} {isWholesale && item.tierApplied && `• Tier ${item.tierApplied}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-[#9E9E9E] hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <Link
                          to={`/product/${item.id}`}
                          onClick={() => setIsCartOpen(false)}
                          className="text-xs font-medium text-[#0A0A0A] hover:text-accent-text line-clamp-1 transition-colors mt-0.5"
                        >
                          {item.name}
                        </Link>

                        <div className="text-[10px] text-[#8A8A8A] mt-0.5">
                          {isWholesale ? (
                            <span>
                              @ ₹{((item.unitPrice || item.wholesale_price || item.price) / (item.unitPrice > 1000 ? 100 : 1)).toLocaleString('en-IN')}/u · MOQ {moq}
                            </span>
                          ) : (
                            <span>₹{((item.price) / (item.price > 1000 ? 100 : 1)).toLocaleString('en-IN')}</span>
                          )}
                        </div>

                        {isBelowMoq && (
                          <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                            Minimum order is {moq} units
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#EAEAEA]">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-[#EAEAEA] rounded bg-white h-6">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, Math.max(moq, item.quantity - packStep))}
                            disabled={item.quantity <= moq}
                            className="px-1.5 h-full hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors disabled:opacity-30 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="px-2 text-xs font-semibold tabular-nums text-[#0A0A0A]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + packStep)}
                            className="px-1.5 h-full hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">
                            {formatMoney(item.lineTotal ?? ((item.price || 0) * item.quantity))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary & Checkout Actions */}
          {displayItems.length > 0 && (
            <CartDrawerFooter
              isWholesale={isWholesale}
              saveCurrentCart={saveCurrentCart}
              exportCartCSV={exportCartCSV}
              setIsCartOpen={setIsCartOpen}
              navigate={navigate}
              cartSubtotal={cartSubtotal}
              cartSavings={cartSavings}
              groupDiscountTotal={groupDiscountTotal}
              shippingFee={shippingFee}
              cartTotal={cartTotal}
              cartSavingsVsRetail={cartSavingsVsRetail}
              meetsMinOrderValue={meetsMinOrderValue}
              hasMoqViolations={hasMoqViolations}
              minOrderValue={minOrderValue}
            />
          )}
        </div>
      </div>
    </div>
  );
}