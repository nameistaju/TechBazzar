import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, ArrowRight, Zap, Shield, Gift } from 'lucide-react';

export default function TechBazaarPlusBanner() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-[#0A0A0A] text-white rounded-[6px] p-8 sm:p-12 lg:p-16 overflow-hidden border border-[#222222]">
          
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#FF4D00]/15 rounded-full filter blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] border border-[#333333] rounded-[2px] text-[10px] uppercase tracking-[0.2em] font-semibold text-[#FF4D00]">
              <Crown size={12} /> TechBazaar Plus
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light uppercase tracking-wide leading-tight">
              Unlock Priority Drops & Zero Shipping Fees
            </h2>

            <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
              Join TechBazaar Plus for ₹499/year. Get early 2-hour access to flash sales, 
              unlimited free express shipping with zero minimum cart order, and complimentary 1-year extended hardware warranty.
            </p>

            {/* Perks Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-[#EAEAEA]">
                <Zap size={14} className="text-[#FF4D00] shrink-0" />
                <span>Zero Min Order Free Shipping</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#EAEAEA]">
                <Shield size={14} className="text-[#FF4D00] shrink-0" />
                <span>+1 Year Extended Warranty</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#EAEAEA]">
                <Gift size={14} className="text-[#FF4D00] shrink-0" />
                <span>Priority Member Drops</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                to="/shop?plus=true"
                className="bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-[4px] hover:bg-[#E04400] transition-colors flex items-center gap-2 shadow-lg group"
              >
                Join Plus for ₹499/yr <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/shop"
                className="text-xs font-medium uppercase tracking-wider text-[#A0A0A0] hover:text-white transition-colors"
              >
                Explore Member Benefits
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
