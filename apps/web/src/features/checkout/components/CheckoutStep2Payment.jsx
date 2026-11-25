import React from 'react';
import { CreditCard, QrCode, Banknote, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import { formatMoney } from '@shared/utils/formatters';

export default function CheckoutStep2Payment({
  handleNextToReview,
  setCurrentStep,
  paymentMethod,
  setPaymentMethod,
  formData,
  isWholesale,
  isAdvancePayment,
  setIsAdvancePayment,
  advanceAmount,
  balanceAmount
}) {
  return (
    <form onSubmit={handleNextToReview} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A] mb-1">
            2. Payment Method
          </h2>
          <p className="text-xs text-[#6B6B6B]">
            Transactions are processed over encrypted 256-bit SSL tunnels.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="text-xs text-[#8A8A8A] hover:text-[#0A0A0A] flex items-center gap-1 font-medium"
        >
          <ArrowLeft size={13} /> Edit Address
        </button>
      </div>

      <div className="space-y-3">
        {[
          { id: 'card', title: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay, Corporate Amex', icon: CreditCard },
          { id: 'upi', title: 'UPI Instant QR / VPA', desc: 'Google Pay, PhonePe, Paytm, CRED Business', icon: QrCode },
          { id: 'bank_transfer', title: 'Direct Bank Transfer (NEFT / RTGS / IMPS)', desc: 'HDFC Bank • A/C: 50200098765432 • IFSC: HDFC0001234', icon: Building2 },
          { id: 'cod', title: 'Cash / Pay on Delivery', desc: 'Available for wholesale orders under ₹50,000', icon: Banknote }
        ].map((method) => {
          const Icon = method.icon;
          const isSelected = paymentMethod === method.id;

          return (
            <div key={method.id} className="space-y-2">
              <label
                className={`flex items-start gap-4 p-4 border rounded-[4px] cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#0A0A0A] bg-[#FAFAFA] ring-1 ring-[#0A0A0A]'
                    : 'border-[#EAEAEA] hover:border-[#BDBDBD]'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={isSelected}
                  onChange={() => setPaymentMethod(method.id)}
                  className="mt-1 accent-[#FF4D00]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#0A0A0A]">{method.title}</span>
                    {method.id === 'bank_transfer' && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded">
                        RECOMMENDED FOR BULK
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6B6B6B] mt-0.5">{method.desc}</p>
                </div>
                <Icon size={18} className="text-[#6B6B6B]" />
              </label>

              {/* Direct Bank Transfer Details Card */}
              {isSelected && method.id === 'bank_transfer' && (
                <div className="p-4 bg-white border border-[#EAEAEA] rounded-[4px] text-xs space-y-2 ml-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-[#F2F2F2] pb-2">
                    <span className="font-semibold text-[#0A0A0A] uppercase tracking-wider text-[10px]">
                      Beneficiary Bank Details
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                      CURRENT A/C
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#6B6B6B]">
                    <div>
                      <span className="text-[10px] uppercase text-[#8A8A8A] block">Account Name</span>
                      <strong className="text-[#0A0A0A]">TechBazaar Electronics Pvt Ltd</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#8A8A8A] block">Bank & Branch</span>
                      <strong className="text-[#0A0A0A]">HDFC Bank, Peenya Ind. Area</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#8A8A8A] block">Account Number</span>
                      <strong className="text-[#0A0A0A] font-mono text-sm">50200098765432</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#8A8A8A] block">IFSC Code</span>
                      <strong className="text-[#0A0A0A] font-mono text-sm">HDFC0001234</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] pt-1 border-t border-[#F2F2F2]">
                    * Bank transfer instructions and auto-generated Tax Invoice will be sent instantly to <strong>{formData.email}</strong>.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isWholesale && (
      <div className="p-4 bg-orange-50/60 border border-orange-200/80 rounded-[4px]">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAdvancePayment}
            onChange={(e) => setIsAdvancePayment(e.target.checked)}
            className="mt-1 accent-[#FF4D00] w-4 h-4 rounded"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                Opt for 50% Advance Booking
              </span>
              <span className="bg-[#FF4D00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                B2B CREDIT
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
              Pay only <strong>{formatMoney(advanceAmount)}</strong> now to confirm order and lock stock. The remaining balance of <strong>{formatMoney(balanceAmount)}</strong> is payable upon dispatch notification before carrier handover.
            </p>
          </div>
        </label>
      </div>
      )}

      <div className="pt-4 border-t border-[#F2F2F2] flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] font-semibold uppercase tracking-wider"
        >
          Back
        </button>
        <button
          type="submit"
          className="py-3.5 px-8 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer"
        >
          Review Order <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}
