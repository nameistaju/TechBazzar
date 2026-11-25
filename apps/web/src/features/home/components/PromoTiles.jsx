import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function PromoTiles() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Tile 1: True Wireless Audio */}
          <div className="bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] p-8 lg:p-10 flex flex-col justify-between group hover:border-[#D4D4D4] transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              <div className="max-w-xs space-y-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-bold">
                  Acoustic Design
                </span>
                <h3 className="text-2xl lg:text-3xl font-light uppercase tracking-wide text-[#0A0A0A] leading-tight">
                  High-Fidelity Wireless Audio
                </h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Featuring 32dB active cancellation, custom dynamic drivers, and titanium acoustic diaphragms.
                </p>
              </div>

              <div className="w-40 h-40 shrink-0 mx-auto sm:mx-0 flex items-center justify-center">
                <img
                  src="/images/image-104.jpg"
                  alt="boAt Airdopes 141 ANC"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-[#EAEAEA] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#8A8A8A] block">Starting from</span>
                <span className="text-base font-semibold text-[#0A0A0A] tabular-nums">₹1,299</span>
              </div>
              <Link
                to="/shop?category=earbuds"
                className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] group-hover:text-[#FF4D00] flex items-center gap-1.5 transition-colors"
              >
                See more <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Tile 2: Designer Phone Cases & MagSafe Armor */}
          <div className="bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] p-8 lg:p-10 flex flex-col justify-between group hover:border-[#D4D4D4] transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              <div className="max-w-xs space-y-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-bold">
                  New Collection Drop
                </span>
                <h3 className="text-2xl lg:text-3xl font-light uppercase tracking-wide text-[#0A0A0A] leading-tight">
                  Designer Phone Cases & Armor
                </h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Grand Prix motorsport collages, Indian heritage palace frescoes, coquette ribbons, and MagSafe wallets.
                </p>
              </div>

              <div className="w-40 h-40 shrink-0 mx-auto sm:mx-0 flex items-center justify-center">
                <img
                  src="/images/phone cases/image-110.jpg"
                  alt="F1 Racing Paddock Phone Case"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-[#EAEAEA] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#8A8A8A] block">Starting from</span>
                <span className="text-base font-semibold text-[#0A0A0A] tabular-nums">₹499</span>
              </div>
              <Link
                to="/shop?category=phone-cases"
                className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] group-hover:text-[#FF4D00] flex items-center gap-1.5 transition-colors"
              >
                See more cases <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
