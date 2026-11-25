import React from 'react';
import { Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@shared/utils/formatters';

export default function CartThresholdBanners({
  isWholesale,
  meetsMinOrderValue,
  minOrderValue,
  amountToMinOrder,
  isFreeShippingMet,
  amountToFreeShipping,
  freeShippingProgress
}) {
  if (isWholesale) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Minimum Order Value Bar */}
        <div className={`p-4 rounded-[4px] border ${
          meetsMinOrderValue 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-[#FFF9F6] border-accent/40 text-[#0A0A0A]'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2 font-medium">
            <span className="flex items-center gap-2">
              {meetsMinOrderValue ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertTriangle size={16} className="text-accent-text" />
              )}
              {meetsMinOrderValue ? (
                <strong className="text-emerald-700">Wholesale Min Order Value Met ({formatMoney(minOrderValue ?? 250000)}+)</strong>
              ) : (
                <span>Add <strong className="text-accent-text tabular-nums font-bold">{formatMoney(amountToMinOrder || 0)}</strong> to meet Wholesale Min Order Value ({formatMoney(minOrderValue ?? 250000)})</span>
              )}
            </span>
          </div>
        </div>

        {/* Free Freight Alert Bar */}
        <div className="bg-[#F7F7F7] border border-[#EAEAEA] p-4 rounded-[4px]">
          <div className="flex items-center justify-between text-xs mb-2 font-medium">
            <span className="flex items-center gap-2 text-[#0A0A0A]">
              <Truck size={16} className="text-accent-text" />
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
    );
  }

  /* Retail Free Shipping Bar (Free over ₹1,499) */
  return (
    <div className="bg-[#F7F7F7] border border-[#EAEAEA] p-4 rounded-[4px] mb-8">
      <div className="flex items-center justify-between text-xs mb-2 font-medium">
        <span className="flex items-center gap-2 text-[#0A0A0A]">
          <Truck size={16} className="text-accent-text" />
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
  );
}
