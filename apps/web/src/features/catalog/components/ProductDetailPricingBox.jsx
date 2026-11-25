import React from 'react';
import { ArrowRight } from 'lucide-react';
import { getWholesaleTier } from '@shared/utils/wholesaleCalculation';

export default function ProductDetailPricingBox({
  isWholesale,
  product,
  quantity,
  setQuantity,
  switchMode
}) {
  if (isWholesale) {
    const tierInfo = getWholesaleTier(product, quantity);
    const mrp = Number(product.mrp || product.originalPrice || Math.round((product.price || 1000) * 1.35));
    return (
      <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-semibold">
              Wholesale Unit Price
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold text-[#0A0A0A] tabular-nums">
                ₹{tierInfo.unitPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-[#8A8A8A] line-through tabular-nums">
                MRP ₹{mrp.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-semibold">
              Line Total ({quantity} units)
            </div>
            <div className="text-xl font-bold text-accent-text tabular-nums">
              ₹{tierInfo.lineTotal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Volume Discount Tiers Table */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EAEAEA]">
          {tierInfo.tiers.map((t, idx) => (
            <div
              key={idx}
              onClick={() => setQuantity(t.minQty)}
              className={`p-2 rounded-[3px] border cursor-pointer text-center transition-all ${
                t.active
                  ? 'bg-accent-tint border-accent shadow-xs'
                  : 'bg-white border-[#EAEAEA] hover:border-[#BDBDBD]'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${t.active ? 'text-accent-text' : 'text-[#6B6B6B]'}`}>
                {t.label}
              </div>
              <div className={`text-sm font-bold tabular-nums mt-0.5 ${t.active ? 'text-accent-text' : 'text-[#0A0A0A]'}`}>
                ₹{t.price.toLocaleString('en-IN')}
              </div>
              <div className="text-[9px] text-[#8A8A8A] mt-0.5">
                {mrp > 0 ? `${Math.round(((mrp - t.price) / mrp) * 100)}% off MRP` : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Margin and Savings pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            You save ₹{tierInfo.savingsVsMrp.toLocaleString('en-IN')} vs MRP ({tierInfo.savingsPercent}%)
          </span>
          <span className="text-[#0A0A0A] font-medium bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
            Est. Resale Margin: <strong className="text-accent-text font-bold">{tierInfo.resaleMarginPercent}%</strong>
          </span>
        </div>

        {/* Next Tier Upsell Nudge */}
        {tierInfo.nextTier && (
          <div className="p-2 bg-white border border-dashed border-accent/60 rounded text-[11px] text-[#0A0A0A] flex items-center justify-between">
            <span>
              Add <strong className="text-accent-text">{tierInfo.nextTier.unitsNeeded} more</strong> to unlock <strong>Tier {tierInfo.nextTier.targetTier} (₹{tierInfo.nextTier.targetUnitPrice}/unit)</strong>
            </span>
            <button
              type="button"
              onClick={() => setQuantity(tierInfo.nextTier.targetQty)}
              className="text-[10px] font-bold text-accent-text hover:underline uppercase tracking-wider ml-2 cursor-pointer"
            >
              Upgrade
            </button>
          </div>
        )}
      </div>
    );
  }

  const retailPrice = Number(product.price || 1000);
  const mrp = Number(product.mrp || product.originalPrice || Math.round(retailPrice * 1.35));
  const savings = mrp - retailPrice;
  const savingsPercent = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
  const lineTotal = retailPrice * quantity;

  return (
    <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-semibold">
            Retail Price
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-bold text-[#0A0A0A] tabular-nums">
              ₹{retailPrice.toLocaleString('en-IN')}
            </span>
            {mrp > retailPrice && (
              <span className="text-sm text-[#8A8A8A] line-through tabular-nums">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
            )}
            {savingsPercent > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Save {savingsPercent}%
              </span>
            )}
          </div>
        </div>

        {quantity > 1 && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B] font-semibold">
              Total ({quantity} items)
            </div>
            <div className="text-xl font-bold text-[#0A0A0A] tabular-nums">
              ₹{lineTotal.toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>

      {/* Subtle wholesale teaser */}
      <div className="p-2.5 bg-white border border-[#EAEAEA] rounded text-[11px] text-[#6B6B6B] flex items-center justify-between">
        <span>Buying in bulk for business or resale?</span>
        <button
          type="button"
          onClick={() => switchMode('wholesale')}
          className="text-accent-text font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          Switch to Wholesale <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}
