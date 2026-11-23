import React from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import ProductCard from '../common/ProductCard';

export default function RecentlyViewedSection() {
  const { recentlyViewed } = useStore();

  if (!recentlyViewed || recentlyViewed.length === 0) return null;

  return (
    <section className="py-14 bg-[#FAFAFA] border-t border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#6B6B6B] font-semibold mb-1">
              <History size={13} /> Your Footprint
            </div>
            <h2 className="text-xl sm:text-2xl font-light uppercase tracking-wider text-[#0A0A0A]">
              Recently Viewed Hardware
            </h2>
          </div>

          <Link
            to="/shop"
            className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:text-[#FF4D00] transition-colors flex items-center gap-1"
          >
            Explore Catalog <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {recentlyViewed.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
