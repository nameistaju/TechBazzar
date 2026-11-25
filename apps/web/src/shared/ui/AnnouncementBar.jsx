import React from 'react';
import { ArrowRight, Truck, ShieldCheck, Sparkles, ArrowLeftRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '@app/providers/StoreContext';
import useAuthStore from '@shared/store/authStore';

export default function AnnouncementBar() {
  const { mode, isApprovedWholesaleUser, switchMode } = useStore();
  const { user } = useAuthStore();

  const groupName = user?.groupName || 'Approved';
  const groupDiscount = user?.groupDiscountPercent || 0;

  return (
    <div className="w-full">
      {/* Top Standard Announcement Bar */}
      <div className="bg-[#0A0A0A] text-white text-[11px] tracking-subtle py-2 px-4 border-b border-[#222222]">
        <div className="max-w-site mx-auto flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-4 text-[#A0A0A0]">
            <span className="flex items-center gap-1.5">
              <Truck size={13} className="text-accent-text" /> Express Pan-India Delivery
            </span>
            <span className="hidden md:inline text-[#444]">•</span>
            <span className="hidden md:flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-accent-text" /> 100% Genuine Brand Warranty
            </span>
          </div>

          <div className="mx-auto sm:mx-0 flex items-center gap-2 font-medium">
            <span className="text-[#D4D4D4]">Use code <strong className="text-accent-text font-semibold tracking-wider">WELCOME10</strong> for 10% off first order</span>
            <Link to="/shop?sale=true" className="inline-flex items-center gap-1 text-accent-text hover:underline underline-offset-4 font-normal">
              Shop Flash Sale <ArrowRight size={11} />
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-[#A0A0A0]">
            <span>Track Order</span>
            <span className="text-[#444]">•</span>
            <span>INR (₹)</span>
          </div>
        </div>
      </div>

      {/* Slim Wholesale Ribbon (Only visible when Wholesale mode is active and buyer is approved) */}
      {mode === 'wholesale' && isApprovedWholesaleUser && (
        <div className="bg-[#18181B] text-white text-[11.5px] py-1.5 px-4 border-b border-[#27272A] flex items-center justify-between animate-fadeIn">
          <div className="max-w-site mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-contrast">
                <Sparkles size={11} /> Wholesale Mode
              </span>
              <span className="text-[#D4D4D4]">
                <strong className="text-white font-semibold">{groupName} Buyer</strong>
                {groupDiscount > 0 ? (
                  <> · Extra <strong className="text-accent-text font-bold">{groupDiscount}%</strong> on every order</>
                ) : (
                  <> · B2B Tier Pricing & GST Invoicing Active</>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => switchMode('retail')}
              className="inline-flex items-center gap-1 text-[11px] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
              title="Switch back to Retail shopping mode"
            >
              <ArrowLeftRight size={12} />
              <span>Switch to Retail</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
