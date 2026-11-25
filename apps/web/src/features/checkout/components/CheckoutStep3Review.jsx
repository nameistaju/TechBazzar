import React from 'react';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { formatMoney } from '@shared/utils/formatters';

export default function CheckoutStep3Review({
  setCurrentStep,
  formData,
  paymentMethod,
  isAdvancePayment,
  advanceAmount,
  balanceAmount,
  cartTotal,
  cart,
  isSubmitting,
  isWholesale,
  handlePlaceOrder
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A] mb-1">
            3. Review & Confirm
          </h2>
          <p className="text-xs text-[#6B6B6B]">
            Final inspection before inventory reservation and dispatch generation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="text-xs text-[#8A8A8A] hover:text-[#0A0A0A] flex items-center gap-1 font-medium"
        >
          <ArrowLeft size={13} /> Change Payment
        </button>
      </div>

      {/* Shipping & Payment Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px]">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#8A8A8A]">
              Delivery & Business Details
            </span>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-accent-text font-semibold text-[10px] uppercase hover:underline"
            >
              Edit
            </button>
          </div>
          <p className="font-semibold text-[#0A0A0A]">{formData.name}</p>
          {formData.businessName && (
            <p className="text-xs font-semibold text-[#0A0A0A] mt-0.5">{formData.businessName}</p>
          )}
          {formData.gstin && (
            <p className="text-[11px] font-mono text-[#0A0A0A] bg-white px-1.5 py-0.5 rounded border border-[#EAEAEA] inline-block mt-1">
              GSTIN: {formData.gstin}
            </p>
          )}
          <p className="text-[#6B6B6B] mt-1">{formData.addressLine}</p>
          <p className="text-[#6B6B6B]">{formData.city}, {formData.pincode}</p>
          <p className="text-[#8A8A8A] mt-1">Phone: {formData.phone}</p>
        </div>

        <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px]">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#8A8A8A]">
              Payment Structure
            </span>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-accent-text font-semibold text-[10px] uppercase hover:underline"
            >
              Edit
            </button>
          </div>
          <p className="font-semibold text-[#0A0A0A] uppercase tracking-wider">
            {paymentMethod === 'bank_transfer'
              ? 'Direct Bank Transfer (NEFT/RTGS)'
              : paymentMethod === 'cod'
              ? 'Cash on Delivery'
              : paymentMethod === 'upi'
              ? 'UPI Instant Pay'
              : 'Credit / Debit Card'}
          </p>
          {isAdvancePayment ? (
            <div className="mt-2 pt-2 border-t border-[#EAEAEA] space-y-1">
              <div className="flex justify-between text-xs font-semibold text-accent-text">
                <span>50% Advance Today:</span>
                <span className="tabular-nums">₹{advanceAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#6B6B6B]">
                <span>Balance on Dispatch:</span>
                <span className="tabular-nums">₹{balanceAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-emerald-700 font-medium mt-1">
              Full Order Payment: ₹{cartTotal.toLocaleString('en-IN')}
            </p>
          )}
          <p className="text-[#8A8A8A] text-[11px] mt-1">
            Tax Invoice sent to: <strong className="text-[#0A0A0A]">{formData.email}</strong>
          </p>
        </div>
      </div>

      {/* Items snapshot */}
      <div className="divide-y divide-[#F2F2F2]">
        {cart.map((item) => (
          <div key={item.id} className="py-3 flex items-center gap-3">
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 object-contain bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-1 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0A0A0A] truncate">{item.name}</p>
              <p className="text-[11px] text-[#6B6B6B]">
                Qty: {item.quantity} × {formatMoney(item.price)} / unit
              </p>
            </div>
            <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">
              {formatMoney(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-[#F2F2F2] flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] font-semibold uppercase tracking-wider"
        >
          Back
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handlePlaceOrder}
          className="py-4 px-10 bg-accent hover:bg-accent-hover text-accent-contrast text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>{isWholesale ? 'Reserving Wholesale Stock...' : 'Placing Your Order...'}</span>
            </>
          ) : (
            <>
              <Lock size={14} />
              <span>
                {isWholesale && isAdvancePayment
                  ? `Confirm & Pay 50% Advance (${formatMoney(advanceAmount)})`
                  : `Confirm Order (${formatMoney(cartTotal)})`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
