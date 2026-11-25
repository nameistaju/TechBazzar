import React from 'react';

export default function TrustNumbersStrip() {
  const stats = [
    { label: 'Bulk Orders Delivered', value: '₹14.2 Cr+' },
    { label: 'Verified Retail Partners', value: '4,200+' },
    { label: 'On-Time Freight Dispatch', value: '99.4%' },
    { label: 'Counterfeit Guarantee', value: '0%' }
  ];

  return (
    <div className="bg-[#0A0A0A] text-white py-10 border-y border-white/10">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
          {stats.map((s, idx) => (
            <div key={idx} className={idx > 0 ? 'pt-6 md:pt-0' : ''}>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-white mb-1 tabular-nums font-mono">
                <span className="text-accent-text">{s.value.slice(0, 1)}</span>
                {s.value.slice(1)}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-[#BDBDBD] font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
