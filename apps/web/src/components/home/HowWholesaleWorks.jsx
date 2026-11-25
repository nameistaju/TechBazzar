import React from 'react';
import { Layers, FileCheck2, Truck, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowWholesaleWorks() {
  const steps = [
    {
      number: '01',
      icon: Layers,
      title: 'Pick Volume Tiers',
      description: 'Transparent bulk pricing starting at low MOQs (5–20 units). Automatic volume discounts at 50+ and 100+ units.'
    },
    {
      number: '02',
      icon: FileCheck2,
      title: '100% GST Invoicing',
      description: 'Receive valid B2B tax invoices instantly with verified GSTIN to claim full Input Tax Credit (ITC).'
    },
    {
      number: '03',
      icon: Truck,
      title: 'Secure Pallet Freight',
      description: 'Direct door-to-door bulk shipping with transit insurance across 19,000+ PIN codes with live tracking.'
    },
    {
      number: '04',
      icon: TrendingUp,
      title: '35%+ Reseller Margins',
      description: 'Sourced directly from verified brands and primary distributors to guarantee maximum retail markup.'
    }
  ];

  return (
    <section className="py-16 bg-[#FAFAFA] border-y border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#FF4D00] font-bold block mb-1">
              B2B Distribution Engine
            </span>
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-wider text-[#0A0A0A]">
              How Wholesale Works
            </h2>
          </div>
          <Link
            to="/quick-order"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:text-[#FF4D00] transition-colors"
          >
            Quick Order by SKU →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 flex flex-col justify-between hover:border-[#0A0A0A] transition-colors shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-light text-[#BDBDBD] group-hover:text-[#FF4D00] transition-colors font-mono">
                      {step.number}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#0A0A0A] group-hover:bg-[#FFF0EB] group-hover:text-[#FF4D00] transition-colors">
                      <Icon size={16} strokeWidth={1.75} />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wide mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#6B6B6B] leading-relaxed">
                    {step.description}
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
