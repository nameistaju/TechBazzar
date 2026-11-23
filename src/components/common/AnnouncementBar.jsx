import React from 'react';
import { ArrowRight, Truck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnnouncementBar() {
  return (
    <div className="bg-[#0A0A0A] text-white text-[11px] tracking-subtle py-2 px-4 border-b border-[#222222]">
      <div className="max-w-site mx-auto flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-4 text-[#A0A0A0]">
          <span className="flex items-center gap-1.5">
            <Truck size={13} className="text-[#FF4D00]" /> Express Pan-India Delivery
          </span>
          <span className="hidden md:inline text-[#444]">•</span>
          <span className="hidden md:flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[#FF4D00]" /> 100% Genuine Brand Warranty
          </span>
        </div>

        <div className="mx-auto sm:mx-0 flex items-center gap-2 font-medium">
          <span className="text-[#D4D4D4]">Use code <strong className="text-[#FF4D00] font-semibold tracking-wider">TECH10</strong> for 10% off</span>
          <Link to="/shop?sale=true" className="inline-flex items-center gap-1 text-[#FF4D00] hover:underline underline-offset-4 font-normal">
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
  );
}
