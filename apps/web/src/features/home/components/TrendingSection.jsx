import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame } from 'lucide-react';
import { useProducts } from '@shared/hooks/useCatalog';
import ProductCard from '@shared/ui/ProductCard';

export default function TrendingSection() {
  const { data } = useProducts({ flag: 'trending', limit: 8 });
  const trendingProducts = data?.products || [];

  return (
    <section className="py-16 bg-white border-t border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent-text font-bold mb-1">
              <Flame size={14} className="fill-current" /> Community Favorites
            </div>
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A]">
              Trending Right Now
            </h2>
          </div>
          <Link
            to="/shop?filter=trending"
            className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:text-accent-text transition-colors flex items-center gap-1 group"
          >
            See all trending <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 4-Column Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
