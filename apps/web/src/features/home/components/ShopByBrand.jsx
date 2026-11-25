import React from 'react';
import { Link } from 'react-router-dom';
import { brands } from '@shared/data/brands';
import { ArrowRight, Award } from 'lucide-react';

export default function ShopByBrand() {
  return (
    <section className="py-16 bg-white border-t border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[#6B6B6B] font-bold mb-1">
              <Award size={13} className="text-accent-text" /> Authorized Partners
            </div>
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A]">
              Shop by Brand
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:text-accent-text transition-colors flex items-center gap-1 group"
          >
            All Brands <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Brand Logo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/shop?brand=${encodeURIComponent(brand.name)}`}
              className="group bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-6 flex flex-col items-center justify-center aspect-[3/2] hover:bg-white hover:border-[#0A0A0A] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300"
            >
              <div className="w-full h-12 flex items-center justify-center p-1">
                <img
                  src={brand.logo}
                  alt={`${brand.name} official logo`}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain filter grayscale contrast-125 opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#6B6B6B] group-hover:text-[#0A0A0A] mt-2 transition-colors">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
