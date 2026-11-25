import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Download, Bookmark, FileText } from 'lucide-react';
import { formatMoney } from '@shared/utils/formatters';

export default function CartDrawerFooter({
  isWholesale,
  saveCurrentCart,
  exportCartCSV,
  setIsCartOpen,
  navigate,
  cartSubtotal,
  cartSavings,
  groupDiscountTotal,
  shippingFee,
  cartTotal,
  cartSavingsVsRetail,
  meetsMinOrderValue,
  hasMoqViolations,
  minOrderValue
}) {
  return (
    <div className="p-5 border-t border-[#EAEAEA] bg-[#FAFAFA]">
      {/* Wholesale tools strip */}
      {isWholesale && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EAEAEA] text-[11px] text-[#6B6B6B]">
          <button
            type="button"
            onClick={() => saveCurrentCart()}
            className="hover:text-[#0A0A0A] flex items-center gap-1 transition-colors cursor-pointer"
            title="Save current cart list"
          >
            <Bookmark size={12} className="text-accent-text" /> Save List
          </button>
          <button
            type="button"
            onClick={exportCartCSV}
            className="hover:text-[#0A0A0A] flex items-center gap-1 transition-colors cursor-pointer"
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
            className="hover:text-accent-text flex items-center gap-1 transition-colors font-medium cursor-pointer"
          >
            <FileText size={12} /> Request Quote
          </button>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="space-y-1.5 mb-3 text-xs">
        <div className="flex justify-between text-[#6B6B6B]">
          <span>{isWholesale ? 'Wholesale Taxable Subtotal' : 'Subtotal'}</span>
          <span className="font-semibold text-[#0A0A0A] tabular-nums">
            {formatMoney(cartSubtotal || 0)}
          </span>
        </div>

        {isWholesale && cartSavings > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Tier Savings</span>
            <span className="tabular-nums">-{formatMoney(cartSavings || 0)}</span>
          </div>
        )}

        {isWholesale && groupDiscountTotal > 0 && (
          <div className="flex justify-between text-accent-text">
            <span>Group Extra Discount</span>
            <span className="tabular-nums">-{formatMoney(groupDiscountTotal || 0)}</span>
          </div>
        )}

        <div className="flex justify-between text-[#6B6B6B]">
          <span>{isWholesale ? 'Freight & Logistics' : 'Standard Shipping'}</span>
          <span>
            {shippingFee === 0 ? (
              <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[11px]">Free</span>
            ) : (
              <span className="tabular-nums">{formatMoney(shippingFee || 0)}</span>
            )}
          </span>
        </div>

        <div className="flex justify-between text-sm font-bold text-[#0A0A0A] pt-1.5 border-t border-[#EAEAEA]">
          <span>Total</span>
          <span className="tabular-nums text-base text-[#0A0A0A]">
            {formatMoney(cartTotal || 0)}
          </span>
        </div>

        {isWholesale && cartSavingsVsRetail > 0 && (
          <div className="text-[10.5px] text-accent-text font-semibold text-center mt-1">
            You save {formatMoney(cartSavingsVsRetail || 0)} vs Retail Customer Price
          </div>
        )}
      </div>

      {/* Checkout CTA Button */}
      <div className="space-y-2">
        {isWholesale ? (
          <button
            type="button"
            disabled={!meetsMinOrderValue || hasMoqViolations}
            onClick={() => {
              setIsCartOpen(false);
              navigate('/wholesale-checkout');
            }}
            className={`w-full text-xs font-semibold uppercase tracking-widest py-3.5 rounded-[4px] transition-all flex items-center justify-center gap-2 group shadow-sm ${
              meetsMinOrderValue && !hasMoqViolations
                ? 'bg-[#0A0A0A] text-white hover:text-accent-contrast hover:bg-accent cursor-pointer'
                : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
            }`}
          >
            {!meetsMinOrderValue ? (
              <span>Min Order {formatMoney(minOrderValue ?? 250000)} Required</span>
            ) : hasMoqViolations ? (
              <span>Adjust MOQ Quantities</span>
            ) : (
              <>
                Wholesale Checkout <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsCartOpen(false);
              navigate('/checkout');
            }}
            className="w-full text-xs font-semibold uppercase tracking-widest py-3.5 rounded-[4px] bg-[#0A0A0A] text-white hover:text-accent-contrast hover:bg-accent transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        )}

        <div className="text-center">
          <Link
            to="/cart"
            onClick={() => setIsCartOpen(false)}
            className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-4"
          >
            View and Edit Full Bag
          </Link>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-[#EAEAEA] flex items-center justify-center gap-1.5 text-[10px] text-[#8A8A8A]">
        <ShieldCheck size={12} className="text-emerald-600" />
        <span>{isWholesale ? 'GST Tax Invoice Included • Pan-India Freight' : '100% Genuine Products • 7-Day Hassle-Free Returns'}</span>
      </div>
    </div>
  );
}
