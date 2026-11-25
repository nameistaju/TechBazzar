import React from 'react';
import { Star } from 'lucide-react';

export default function ProductDetailTabs({ product, activeTab, setActiveTab }) {
  return (
    <div className="mt-16 pt-10 border-t border-[#EAEAEA]">
      <div className="flex gap-8 border-b border-[#EAEAEA] mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'specs'
              ? 'border-b-2 border-accent text-[#0A0A0A]'
              : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
          }`}
        >
          Technical Specifications
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('description')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'description'
              ? 'border-b-2 border-accent text-[#0A0A0A]'
              : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
          }`}
        >
          Overview & Architecture
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-b-2 border-accent text-[#0A0A0A]'
              : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
          }`}
        >
          Reviews ({product.reviewsCount || 420})
        </button>
      </div>

      <div className="max-w-3xl">
        {activeTab === 'specs' && (
          <div className="divide-y divide-[#F2F2F2]">
            {Object.entries(product.specs || {}).map(([key, value]) => (
              <div key={key} className="py-3 grid grid-cols-3 gap-4 text-xs">
                <span className="font-semibold text-[#0A0A0A]">{key}</span>
                <span className="col-span-2 text-[#6B6B6B]">{value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'description' && (
          <div className="space-y-4 text-xs text-[#6B6B6B] leading-relaxed">
            <p>
              The {product.name} represents high-precision industrial craft tailored for discerning technology enthusiasts. Every component is rigorously calibrated for enduring performance, tactile satisfaction, and minimalist elegance.
            </p>
            <p>
              Engineered with premium materials and backed by TechBazaar's 100% authenticity guarantee, this hardware is inspected, sealed, and dispatched with climate-conscious packaging.
            </p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="p-4 bg-[#F7F7F7] rounded-[4px] border border-[#EAEAEA] flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-[#0A0A0A] tabular-nums">
                  {product.rating} / 5.0
                </div>
                <p className="text-xs text-[#6B6B6B]">Based on verified customer purchases across India</p>
              </div>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="fill-current" />
                ))}
              </div>
            </div>

            <div className="space-y-4 divide-y divide-[#F2F2F2]">
              <div className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#0A0A0A]">Kavya M. (Bengaluru)</span>
                  <span className="text-[10px] text-[#8A8A8A]">3 days ago</span>
                </div>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  "Spectacular build quality and the finish is even cleaner in person. Fast dispatch by TechBazaar — reached me in 48 hours."
                </p>
              </div>
              <div className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#0A0A0A]">Rohan S. (Mumbai)</span>
                  <span className="text-[10px] text-[#8A8A8A]">1 week ago</span>
                </div>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  "Authentic sealed unit. Battery life and acoustic fidelity easily match the manufacturer claims. Highly recommended!"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
