import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function EditorialBlock() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Images Duo Column (Electova style: 1 large + 1 small overlay) */}
          <div className="lg:col-span-7 relative">
            <div className="grid grid-cols-12 gap-4 items-end">
              
              {/* Primary Large Image */}
              <div className="col-span-8 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] p-8 aspect-[4/5] flex items-center justify-center overflow-hidden group">
                <img
                  src="/images/image-103.jpg"
                  alt="Apple Watch Ultra Rose Gold Metal Chain"
                  className="w-full h-full object-contain filter group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Secondary Small Accent Image */}
              <div className="col-span-4 bg-[#F2F2F2] border border-[#EAEAEA] rounded-[4px] p-4 aspect-square flex items-center justify-center overflow-hidden group shadow-md -ml-6 mb-8 z-10">
                <img
                  src="/images/image-117.webp"
                  alt="Fire-Boltt Emerald Luxury Chronograph"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>

            {/* Subtle floating badge */}
            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm border border-[#EAEAEA] px-3 py-1.5 rounded-[2px] text-[10px] uppercase tracking-widest font-semibold text-[#0A0A0A]">
              Horological Series 2026
            </div>
          </div>

          {/* Right Editorial Story Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent-text font-bold">
              <Sparkles size={12} />
              Editorial Spotlight
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light uppercase tracking-wide text-[#0A0A0A] leading-tight">
              PRECISION WRIST COMPUTING
            </h2>

            <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
              We bridge the boundary between Swiss haute horlogerie geometry and cutting-edge optical biosensors. 
              Featuring solid 316L stainless steel links, aerospace titanium alloys, and sapphire crystal displays 
              rated for extreme mountain altitudes and deep water exploration.
            </p>

            <div className="space-y-3 pt-2 text-xs text-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                <span>Aerospace grade titanium and solid stainless link bracelets</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                <span>Continuous 24/7 SpO2, HRV, and sleep architecture telemetry</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                <span>Up to 10-day battery stamina with rapid wireless induction</span>
              </div>
            </div>

            <div className="pt-4">
              <Link
                to="/shop?category=smartwatches"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#0A0A0A] hover:text-accent-text transition-colors group"
              >
                See more watches <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
