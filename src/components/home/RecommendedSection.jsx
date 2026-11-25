import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ThumbsUp } from 'lucide-react';
import { useProducts } from '../../hooks/useCatalog';
import ProductCard from '../common/ProductCard';

export default function RecommendedSection() {
  const { data } = useProducts({ flag: 'recommended', limit: 8 });
  const recommendedProducts = data?.products || [];

  return (
    <section className="py-16 bg-[#FAFAFA] border-t border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[#6B6B6B] font-bold mb-1">
              <ThumbsUp size={13} className="text-[#FF4D00]" /> Editorial Selection
            </div>
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A]">
              Recommended for You
            </h2>
          </div>
          <Link
            to="/shop?filter=recommended"
            className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:text-[#FF4D00] transition-colors flex items-center gap-1 group"
          >
            Explore All <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 4-Column Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {recommendedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
