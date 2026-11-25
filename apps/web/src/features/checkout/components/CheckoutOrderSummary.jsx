import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck } from 'lucide-react';
import { formatMoney } from '@shared/utils/formatters';

export default function CheckoutOrderSummary({
  isWholesale,
  cart,
  cartSubtotal,
  couponDiscountAmount,
  appliedCoupon,
  shippingFee,
  cartTotal,
  isAdvancePayment,
  advanceAmount,
  balanceAmount
}) {
  return (
    <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
      <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F2F2F2] pb-3 mb-4">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#0A0A0A]">
            {isWholesale ? 'Wholesale Summary' : 'Order Summary'} ({cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'})
          </span>
          <Link to="/cart" className="text-[11px] text-accent-text hover:underline font-medium">
            Modify Bag
          </Link>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-[#6B6B6B]">
            <span>{isWholesale ? 'Wholesale Subtotal (excl. GST)' : 'Subtotal (incl. GST)'}</span>
            <span className="tabular-nums">{formatMoney(isWholesale ? Math.round(cartSubtotal / 1.18) : cartSubtotal)}</span>
          </div>
          {isWholesale && (
          <div className="flex justify-between text-[#6B6B6B]">
            <span>GST (18% ITC Eligible)</span>
            <span className="tabular-nums">{formatMoney(Math.round(cartSubtotal - (cartSubtotal / 1.18)))}</span>
          </div>
          )}
          {couponDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700 font-medium">
            <span>Coupon ({appliedCoupon?.code})</span>
            <span className="tabular-nums">-{formatMoney(couponDiscountAmount)}</span>
          </div>
          )}
          <div className="flex justify-between text-[#6B6B6B]">
            <span>{isWholesale ? 'Pallet Freight / Express Logistics' : 'Standard Shipping'}</span>
            <span className="tabular-nums">
              {shippingFee === 0 ? (
                <span className="text-emerald-600 font-semibold uppercase text-[10px]">FREE</span>
              ) : (
                formatMoney(shippingFee)
              )}
            </span>
          </div>
          <div className="pt-3 border-t border-[#F2F2F2] flex justify-between items-baseline font-bold text-sm text-[#0A0A0A]">
            <span>Total Order Value</span>
            <span className="text-base text-[#0A0A0A] tabular-nums">
              {formatMoney(cartTotal)}
            </span>
          </div>

          {/* 50% Advance Breakdown */}
          {isWholesale && isAdvancePayment && (
            <div className="mt-3 pt-3 border-t border-dashed border-[#EAEAEA] space-y-1.5 bg-[#FAFAFA] p-2.5 rounded-[4px]">
              <div className="flex justify-between text-xs font-bold text-accent-text">
                <span>50% Advance Due Today</span>
                <span className="tabular-nums">{formatMoney(advanceAmount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#6B6B6B]">
                <span>Balance Due on Dispatch</span>
                <span className="tabular-nums">{formatMoney(balanceAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Guarantees */}
        <div className="mt-6 pt-4 border-t border-[#F2F2F2] space-y-2 text-[11px] text-[#6B6B6B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#0A0A0A]" />
            <span>100% Genuine Sealed Electronics</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-[#0A0A0A]" />
            <span>{isWholesale ? 'Free Freight over ₹10,000' : 'Free Express Shipping over ₹1,499'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
