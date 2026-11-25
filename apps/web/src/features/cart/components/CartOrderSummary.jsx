import React from 'react';
import { ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { formatMoney } from '@shared/utils/formatters';

export default function CartOrderSummary({
  isWholesale,
  handleApplyCoupon,
  couponCode,
  setCouponCode,
  isApplyingCoupon,
  discountApplied,
  appliedCoupon,
  couponDiscount,
  setAppliedCoupon,
  couponError,
  cartSubtotal,
  cartSavings,
  groupDiscountTotal,
  volumeDiscountAmount,
  volumeDiscountPercent,
  shippingFee,
  finalPayableTotal,
  cartSavingsVsRetail,
  meetsMinOrderValue,
  hasMoqViolations,
  minOrderValue,
  navigate
}) {
  return (
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
            className="bg-[#0A0A0A] text-accent-contrast hover:bg-accent disabled:opacity-60 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-[4px] transition-colors cursor-pointer"
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
          <div className="flex justify-between text-accent-text pt-3">
            <span>Wholesale Group Extra Discount</span>
            <span className="font-semibold tabular-nums">
              -{formatMoney(groupDiscountTotal || 0)}
            </span>
          </div>
        )}

        {isWholesale && volumeDiscountAmount > 0 && (
          <div className="flex justify-between text-accent-text pt-3">
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
          <div className="pt-3 text-[11px] text-accent-text font-semibold text-center">
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
                ? 'bg-[#0A0A0A] hover:bg-accent text-accent-contrast cursor-pointer'
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
            className="w-full text-xs font-semibold uppercase tracking-widest py-4 rounded-[4px] bg-[#0A0A0A] hover:bg-accent text-accent-contrast transition-colors flex items-center justify-center gap-2 group shadow-sm cursor-pointer"
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
  );
}
