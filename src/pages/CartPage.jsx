import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  Tag, 
  Check, 
  ArrowLeft 
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import Breadcrumbs from '../components/common/Breadcrumbs';

export default function CartPage() {
  const { 
    cart, 
    cartCount, 
    cartSubtotal, 
    cartSavings, 
    shippingFee, 
    cartTotal, 
    freeShippingProgress, 
    amountToFreeShipping, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    showToast 
  } = useStore();

  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    if (couponCode.trim().toUpperCase() === 'TECH10') {
      setDiscountApplied(true);
      showToast('Coupon TECH10 applied successfully! 10% discount added.');
    } else {
      setCouponError('Invalid coupon code. Try "TECH10" for 10% off.');
    }
  };

  const couponDiscount = discountApplied ? Math.round(cartSubtotal * 0.1) : 0;
  const finalPayableTotal = Math.max(0, cartTotal - couponDiscount);

  if (cart.length === 0) {
    return (
      <div className="bg-white min-h-[70vh] py-16">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#F7F7F7] border border-[#EAEAEA] flex items-center justify-center text-[#9E9E9E] mb-4">
            <ShoppingBag size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-light uppercase tracking-widest text-[#0A0A0A] mb-2">
            Your Shopping Bag is Empty
          </h1>
          <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto mb-8 leading-relaxed">
            Discover precision wireless audio, luxury smartwatches, rugged cables, and tactical gear.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-[4px] hover:bg-[#FF4D00] transition-colors"
          >
            Start Exploring Products <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Shopping Bag' }]} />

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between py-6 border-b border-[#EAEAEA] mb-8 gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-bold block mb-1">
              Cart Review
            </span>
            <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A]">
              Shopping Bag ({cartCount} {cartCount === 1 ? 'item' : 'items'})
            </h1>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-[#8A8A8A] hover:text-red-500 transition-colors uppercase tracking-wider flex items-center gap-1 self-start sm:self-auto"
          >
            <Trash2 size={13} /> Clear Bag
          </button>
        </div>

        {/* Free Shipping Alert Bar */}
        <div className="bg-[#F7F7F7] border border-[#EAEAEA] p-4 rounded-[4px] mb-8">
          <div className="flex items-center justify-between text-xs mb-2 font-medium">
            <span className="flex items-center gap-2 text-[#0A0A0A]">
              <Truck size={16} className="text-[#FF4D00]" />
              {amountToFreeShipping === 0 ? (
                <strong className="text-emerald-600 font-semibold">You've unlocked FREE Express Shipping!</strong>
              ) : (
                <span>Add <strong className="text-[#0A0A0A] tabular-nums font-semibold">₹{amountToFreeShipping.toLocaleString('en-IN')}</strong> more to unlock FREE Express Pan-India Shipping</span>
              )}
            </span>
            <span className="text-xs text-[#6B6B6B] tabular-nums">{freeShippingProgress}%</span>
          </div>
          <div className="w-full h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#FF4D00] transition-all duration-500 rounded-full"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* 2-Column Cart Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Cart Table */}
          <div className="lg:col-span-8 divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
            {cart.map((item) => (
              <div key={item.id} className="py-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between group">
                
                {/* Image & Title */}
                <div className="flex gap-4 items-center flex-1 min-w-0">
                  <Link 
                    to={`/product/${item.id}`} 
                    className="w-20 h-20 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-2 shrink-0 flex items-center justify-center overflow-hidden"
                  >
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                    />
                  </Link>

                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-medium block">
                      {item.brand}
                    </span>
                    <Link
                      to={`/product/${item.id}`}
                      className="text-xs sm:text-sm font-medium text-[#0A0A0A] hover:text-[#FF4D00] transition-colors line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <span className="text-xs text-[#8A8A8A] block mt-1 tabular-nums">
                      ₹{item.price.toLocaleString('en-IN')} each
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Total */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0">
                  
                  {/* Stepper */}
                  <div className="flex items-center border border-[#EAEAEA] rounded-[4px] bg-white">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1.5 hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-3 text-xs font-semibold tabular-nums text-[#0A0A0A]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1.5 hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right min-w-[90px]">
                    <span className="text-sm font-semibold text-[#0A0A0A] tabular-nums">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <div className="text-[11px] text-[#8A8A8A] line-through tabular-nums">
                        ₹{(item.originalPrice * item.quantity).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="text-[#9E9E9E] hover:text-red-500 transition-colors p-1"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            ))}

            <div className="pt-6 pb-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors uppercase tracking-wider"
              >
                <ArrowLeft size={13} /> Continue Shopping
              </Link>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] p-6 lg:p-8 space-y-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#0A0A0A]">
              Order Summary
            </h2>

            {/* Coupon Code Input */}
            <div>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. TECH10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-white border border-[#EAEAEA] uppercase text-xs text-[#0A0A0A] px-3 py-2.5 rounded-[4px] outline-none focus:border-[#0A0A0A]"
                />
                <button
                  type="submit"
                  className="bg-[#0A0A0A] text-white hover:bg-[#FF4D00] text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-[4px] transition-colors"
                >
                  Apply
                </button>
              </form>
              {discountApplied && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 mt-1.5">
                  <Check size={12} /> 10% discount applied!
                </div>
              )}
              {couponError && (
                <div className="text-[11px] text-red-600 mt-1.5">
                  {couponError}
                </div>
              )}
            </div>

            {/* Calculation rows */}
            <div className="space-y-3 text-xs divide-y divide-[#EAEAEA] pt-2">
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Bag Subtotal</span>
                <span className="font-medium text-[#0A0A0A] tabular-nums">₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>

              {cartSavings > 0 && (
                <div className="flex justify-between text-emerald-700 pt-3">
                  <span>Catalog Discount</span>
                  <span className="font-semibold tabular-nums">-₹{cartSavings.toLocaleString('en-IN')}</span>
                </div>
              )}

              {discountApplied && (
                <div className="flex justify-between text-emerald-700 pt-3">
                  <span>Promo TECH10 (10%)</span>
                  <span className="font-semibold tabular-nums">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-[#6B6B6B] pt-3">
                <span>Shipping</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-emerald-600 font-semibold uppercase tracking-wider text-[11px]">Free</span>
                  ) : (
                    <span className="tabular-nums">₹{shippingFee}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-semibold text-[#0A0A0A] pt-4">
                <span>Total Payable</span>
                <span className="tabular-nums text-lg">₹{finalPayableTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Checkout Action */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="w-full bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs font-semibold uppercase tracking-widest py-4 rounded-[4px] transition-colors flex items-center justify-center gap-2 group shadow-sm"
              >
                Proceed to Checkout <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#8A8A8A]">
                <ShieldCheck size={14} className="text-emerald-600" /> 100% Secure Encrypted Checkout
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
