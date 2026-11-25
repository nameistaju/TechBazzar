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
  ArrowLeft,
  Bookmark,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Building2,
  ArrowLeftRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMoney } from '../utils/formatters';
import Breadcrumbs from '../components/common/Breadcrumbs';
import BannerSlot from '../components/common/BannerSlot';

export default function CartPage() {
  const { 
    mode,
    switchMode,
    otherCartCount,
    cart, 
    cartItems,
    cartCount, 
    cartSubtotal, 
    cartSavings, 
    cartSavingsVsRetail,
    groupDiscountTotal,
    volumeDiscountAmount,
    volumeDiscountPercent,
    shippingFee, 
    cartTotal, 
    taxableValue,
    totalTax,
    couponDiscountAmount,
    appliedCoupon,
    setAppliedCoupon,
    minOrderValue,
    meetsMinOrderValue,
    amountToMinOrder,
    hasMoqViolations,
    freeShippingProgress, 
    amountToFreeShipping, 
    isFreeShippingMet,
    saveCurrentCart,
    exportCartCSV,
    updateQuantity, 
    removeFromCart, 
    clearCart,
    showToast 
  } = useStore();

  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || '');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const isWholesale = mode === 'wholesale';
  const displayItems = cartItems || cart;

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const res = await fetch('/api/cart/apply-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code,
          items: displayItems.map(it => ({ productId: it.id, quantity: it.quantity })),
          channel: isWholesale ? 'wholesale' : 'retail'
        })
      });
      const json = await res.json();
      if (!res.ok || !json?.data?.valid) {
        setAppliedCoupon(null);
        setCouponError(json?.error || json?.data?.reason || 'Invalid or ineligible coupon code.');
        return;
      }
      setAppliedCoupon({
        code: json.data.code,
        discountAmount: json.data.discountAmount,
        title: json.data.title
      });
      showToast(`Coupon ${json.data.code} applied! Saved ${formatMoney(json.data.discountAmount)}.`);
    } catch {
      setCouponError('Unable to validate coupon right now. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const discountApplied = Boolean(appliedCoupon && couponDiscountAmount > 0);
  const couponDiscount = couponDiscountAmount || 0;
  const finalPayableTotal = cartTotal;

  if (displayItems.length === 0) {
    return (
      <div className="bg-white min-h-[70vh] py-16">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#F7F7F7] border border-[#EAEAEA] flex items-center justify-center text-[#9E9E9E] mb-4">
            <ShoppingBag size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-light uppercase tracking-widest text-[#0A0A0A] mb-2">
            {isWholesale ? 'Your Wholesale Bag is Empty' : 'Your Shopping Bag is Empty'}
          </h1>
          <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto mb-6 leading-relaxed">
            {isWholesale
              ? 'Add bulk products or upload an SKU spreadsheet to initiate B2B commercial procurement.'
              : 'Discover precision wireless audio, luxury smartwatches, rugged cables, and tactical gear.'}
          </p>

          {otherCartCount > 0 && (
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] text-xs text-[#71717A]">
              <span>You have <strong>{otherCartCount} items</strong> in your {isWholesale ? 'Retail' : 'Wholesale'} bag.</span>
              <button
                type="button"
                onClick={() => switchMode(isWholesale ? 'retail' : 'wholesale')}
                className="text-[#FF4D00] font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                Switch Bag <ArrowRight size={11} />
              </button>
            </div>
          )}

          <div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-[4px] hover:bg-[#FF4D00] transition-colors"
            >
              {isWholesale ? 'Explore Wholesale Catalog' : 'Start Exploring Products'} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={[
            { label: isWholesale ? 'Wholesale Procurement' : 'Shopping Bag' }
          ]} 
        />

        {/* Title & Channel Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between py-6 border-b border-[#EAEAEA] mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-bold">
                {isWholesale ? 'B2B Procurement Review' : 'Retail Cart Review'}
              </span>
              {isWholesale && (
                <span className="bg-[#0A0A0A] text-[#FF4D00] border border-[#FF4D00]/40 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                  Wholesale Channel
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A]">
              {isWholesale ? 'Wholesale Procurement Bag' : 'Shopping Bag'} ({cartCount} {cartCount === 1 ? 'item' : 'items'})
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Subtle Switch Mode Prompt */}
            {!isWholesale ? (
              <button
                type="button"
                onClick={() => switchMode('wholesale')}
                className="text-xs text-[#FF4D00] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Building2 size={13} /> Buying for Business? Switch to Wholesale
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('retail')}
                className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeftRight size={12} /> Switch to Retail Bag
              </button>
            )}

            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-[#8A8A8A] hover:text-red-500 transition-colors uppercase tracking-wider flex items-center gap-1"
            >
              <Trash2 size={13} /> Clear Bag
            </button>
          </div>
        </div>

        {/* Slot 5: cart-promo Banner */}
        <div className="mb-6">
          <BannerSlot slot="cart-promo" />
        </div>

        {/* Threshold Bars */}
        {isWholesale ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Minimum Order Value Bar */}
            <div className={`p-4 rounded-[4px] border ${
              meetsMinOrderValue 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-[#FFF9F6] border-[#FF4D00]/40 text-[#0A0A0A]'
            }`}>
              <div className="flex items-center justify-between text-xs mb-2 font-medium">
                <span className="flex items-center gap-2">
                  {meetsMinOrderValue ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={16} className="text-[#FF4D00]" />
                  )}
                  {meetsMinOrderValue ? (
                    <strong className="text-emerald-700">Wholesale Min Order Value Met ({formatMoney(minOrderValue ?? 250000)}+)</strong>
                  ) : (
                    <span>Add <strong className="text-[#FF4D00] tabular-nums font-bold">{formatMoney(amountToMinOrder || 0)}</strong> to meet Wholesale Min Order Value ({formatMoney(minOrderValue ?? 250000)})</span>
                  )}
                </span>
              </div>
            </div>

            {/* Free Freight Alert Bar */}
            <div className="bg-[#F7F7F7] border border-[#EAEAEA] p-4 rounded-[4px]">
              <div className="flex items-center justify-between text-xs mb-2 font-medium">
                <span className="flex items-center gap-2 text-[#0A0A0A]">
                  <Truck size={16} className="text-[#FF4D00]" />
                  {isFreeShippingMet ? (
                    <strong className="text-emerald-700 font-semibold">FREE Commercial Pallet Freight Unlocked!</strong>
                  ) : (
                    <span>Add <strong className="text-[#0A0A0A] tabular-nums font-semibold">{formatMoney(amountToFreeShipping || 0)}</strong> for Free Pallet Freight</span>
                  )}
                </span>
                <span className="text-xs text-[#6B6B6B] tabular-nums">{freeShippingProgress || 0}%</span>
              </div>
              <div className="w-full h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                  style={{ width: `${freeShippingProgress || 0}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Retail Free Shipping Bar (Free over ₹1,499) */
          <div className="bg-[#F7F7F7] border border-[#EAEAEA] p-4 rounded-[4px] mb-8">
            <div className="flex items-center justify-between text-xs mb-2 font-medium">
              <span className="flex items-center gap-2 text-[#0A0A0A]">
                <Truck size={16} className="text-[#FF4D00]" />
                {isFreeShippingMet ? (
                  <strong className="text-emerald-700 font-semibold">FREE Express Shipping Unlocked!</strong>
                ) : (
                  <span>Add <strong className="text-[#0A0A0A] tabular-nums font-semibold">{formatMoney(amountToFreeShipping || 0)}</strong> for Free Shipping</span>
                )}
              </span>
              <span className="text-xs text-[#6B6B6B] tabular-nums">{freeShippingProgress || 0}%</span>
            </div>
            <div className="w-full h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#0A0A0A] transition-all duration-300 rounded-full"
                style={{ width: `${freeShippingProgress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* B2B Utilities Bar (Wholesale only) */}
        {isWholesale && (
          <div className="bg-white border border-[#EAEAEA] p-3 rounded-[4px] mb-8 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#6B6B6B]">
              <span className="font-semibold text-[#0A0A0A] uppercase tracking-wider text-[11px]">B2B Bulk Tools:</span>
              <span>Volume tiers applied automatically. Final GST tax credit breakdown at checkout.</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => saveCurrentCart()}
                className="px-3 py-1.5 rounded border border-[#EAEAEA] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bookmark size={13} className="text-[#FF4D00]" /> Save Cart List
              </button>
              <button
                type="button"
                onClick={exportCartCSV}
                className="px-3 py-1.5 rounded border border-[#EAEAEA] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={13} /> Export to CSV
              </button>
              <button
                type="button"
                onClick={() => navigate('/quote')}
                className="px-3 py-1.5 rounded bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText size={13} /> Request Custom Quote
              </button>
            </div>
          </div>
        )}

        {/* 2-Column Cart Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Cart Table */}
          <div className="lg:col-span-8 divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
            {displayItems.map((item) => {
              const moq = isWholesale ? (item.moq || 10) : 1;
              const packStep = isWholesale ? (item.packSize || item.stepQuantity || 5) : 1;
              const isBelowMoq = isWholesale && item.quantity < moq;

              return (
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-medium">
                          {item.brand}
                        </span>
                        {isWholesale && item.tierApplied && (
                          <span className="bg-[#0A0A0A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                            Tier {item.tierApplied}
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/product/${item.id}`}
                        className="text-xs sm:text-sm font-medium text-[#0A0A0A] hover:text-[#FF4D00] transition-colors line-clamp-1 mt-0.5"
                      >
                        {item.name}
                      </Link>

                      <div className="flex items-center gap-2 text-xs text-[#8A8A8A] mt-1 tabular-nums">
                        {isWholesale ? (
                          <>
                            <span>₹{((item.unitPrice || item.wholesale_price || item.price) / (item.unitPrice > 1000 ? 100 : 1)).toLocaleString('en-IN')} / unit</span>
                            <span>•</span>
                            <span>MOQ: {moq}</span>
                            {item.savingsVsMrp > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-medium">Save {formatMoney(item.savingsVsMrp)}</span>
                              </>
                            )}
                          </>
                        ) : (
                          <span>{formatMoney(item.price)} / unit</span>
                        )}
                      </div>

                      {isBelowMoq && (
                        <div className="text-[10px] text-red-600 font-semibold mt-1">
                          Minimum order quantity is {moq} units
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Controls & Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0">
                    
                    {/* Stepper */}
                    <div className="flex items-center border border-[#EAEAEA] rounded-[4px] bg-white">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, Math.max(moq, item.quantity - packStep))}
                        disabled={item.quantity <= moq}
                        className="p-1.5 hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors disabled:opacity-30 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="px-3 text-xs font-semibold tabular-nums text-[#0A0A0A]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + packStep)}
                        className="p-1.5 hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right min-w-[90px]">
                      <span className="text-sm font-bold text-[#0A0A0A] tabular-nums">
                        {formatMoney(item.lineTotal ?? ((item.price || 0) * item.quantity))}
                      </span>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-[#9E9E9E] hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>
              );
            })}

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
              {isWholesale ? 'Commercial Order Summary' : 'Order Summary'}
            </h2>

            {/* Coupon Code Input */}
            <div>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. WELCOME10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-white border border-[#EAEAEA] uppercase text-xs text-[#0A0A0A] px-3 py-2.5 rounded-[4px] outline-none focus:border-[#0A0A0A]"
                />
                <button
                  type="submit"
                  disabled={isApplyingCoupon}
                  className="bg-[#0A0A0A] text-white hover:bg-[#FF4D00] disabled:opacity-60 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-[4px] transition-colors cursor-pointer"
                >
                  {isApplyingCoupon ? '...' : 'Apply'}
                </button>
              </form>
              {discountApplied && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Check size={12} /> {appliedCoupon.code} applied (-{formatMoney(couponDiscount)})
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                    className="text-[#6B6B6B] hover:text-[#0A0A0A] underline cursor-pointer"
                  >
                    Remove
                  </button>
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
                <span>{isWholesale ? 'Taxable Subtotal' : 'Bag Subtotal'}</span>
                <span className="font-medium text-[#0A0A0A] tabular-nums">
                  {formatMoney(cartSubtotal || 0)}
                </span>
              </div>

              {isWholesale && cartSavings > 0 && (
                <div className="flex justify-between text-emerald-700 pt-3">
                  <span>Volume Tier Savings</span>
                  <span className="font-semibold tabular-nums">
                    -{formatMoney(cartSavings || 0)}
                  </span>
                </div>
              )}

              {isWholesale && groupDiscountTotal > 0 && (
                <div className="flex justify-between text-[#FF4D00] pt-3">
                  <span>Wholesale Group Extra Discount</span>
                  <span className="font-semibold tabular-nums">
                    -{formatMoney(groupDiscountTotal || 0)}
                  </span>
                </div>
              )}

              {isWholesale && volumeDiscountAmount > 0 && (
                <div className="flex justify-between text-[#FF4D00] pt-3">
                  <span>Volume Tier Incentive ({volumeDiscountPercent}%)</span>
                  <span className="font-semibold tabular-nums">
                    -{formatMoney(volumeDiscountAmount || 0)}
                  </span>
                </div>
              )}

              {discountApplied && (
                <div className="flex justify-between text-emerald-700 pt-3">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span className="font-semibold tabular-nums">-{formatMoney(couponDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#6B6B6B] pt-3">
                <span>{isWholesale ? 'Pallet Freight' : 'Shipping'}</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[11px]">Free</span>
                  ) : (
                    <span className="tabular-nums">{formatMoney(shippingFee || 0)}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-semibold text-[#0A0A0A] pt-4">
                <span>{isWholesale ? 'Net Commercial Total' : 'Total Payable'}</span>
                <span className="tabular-nums text-lg text-[#0A0A0A]">
                  {formatMoney(finalPayableTotal || 0)}
                </span>
              </div>

              {isWholesale && cartSavingsVsRetail > 0 && (
                <div className="pt-3 text-[11px] text-[#FF4D00] font-semibold text-center">
                  You saved {formatMoney(cartSavingsVsRetail || 0)} compared to Retail Single-Unit Pricing!
                </div>
              )}
            </div>

            {/* Checkout Action */}
            <div className="space-y-3 pt-2">
              {isWholesale ? (
                <button
                  type="button"
                  disabled={!meetsMinOrderValue || hasMoqViolations}
                  onClick={() => navigate('/wholesale-checkout')}
                  className={`w-full text-xs font-semibold uppercase tracking-widest py-4 rounded-[4px] transition-colors flex items-center justify-center gap-2 group shadow-sm ${
                    meetsMinOrderValue && !hasMoqViolations
                      ? 'bg-[#0A0A0A] hover:bg-[#FF4D00] text-white cursor-pointer'
                      : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  {!meetsMinOrderValue ? (
                    <span>Min Order {formatMoney(minOrderValue ?? 250000)} Required</span>
                  ) : hasMoqViolations ? (
                    <span>Adjust MOQ Violations</span>
                  ) : (
                    <>
                      Proceed to Wholesale Checkout <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="w-full text-xs font-semibold uppercase tracking-widest py-4 rounded-[4px] bg-[#0A0A0A] hover:bg-[#FF4D00] text-white transition-colors flex items-center justify-center gap-2 group shadow-sm cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#8A8A8A]">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>{isWholesale ? 'GST Tax Invoice Included • 100% Genuine Hardware' : 'Safe & Encrypted Checkout • 100% Genuine Brand Warranty'}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}