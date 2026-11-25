import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Lock } from 'lucide-react';

const trustPillars = [
  {
    icon: ShieldCheck,
    title: '100% Authentic Products',
    description: 'Direct procurement from certified brand manufacturers with official manufacturer warranty.'
  },
  {
    icon: Truck,
    title: 'Express Pan-India Dispatch',
    description: 'Orders dispatched within 24 hours via premium air cargo partners with real-time GPS tracking.'
  },
  {
    icon: RotateCcw,
    title: '7-Day Hassle-Free Returns',
    description: 'Instant doorstep quality check and immediate refunds or replacements with zero questions asked.'
  },
  {
    icon: Lock,
    title: 'Secure Encrypted Payments',
    description: 'Bank-grade 256-bit SSL encryption supporting UPI, Cards, Net Banking, and Cash on Delivery.'
  }
];

export default function TrustStrip() {
  return (
    <section className="py-14 bg-white border-t border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustPillars.map((pillar, idx) => {
            const IconComponent = pillar.icon;
            return (
              <div key={idx} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-[4px] bg-[#F7F7F7] border border-[#EAEAEA] flex items-center justify-center text-accent-text shrink-0">
                  <IconComponent size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] mb-1">
                    {pillar.title}
                  </h4>
                  <p className="text-xs text-[#6B6B6B] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
