import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { categories } from '../data/categories';

export default function NotFoundPage() {
  return (
    <div className="bg-white min-h-[75vh] flex items-center justify-center py-20">
      <div className="max-w-xl mx-auto px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#F7F7F7] border border-[#EAEAEA] flex items-center justify-center text-[#FF4D00] mx-auto mb-6">
          <Compass size={28} strokeWidth={1.5} />
        </div>
        
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-bold block mb-2">
          Error 404
        </span>
        <h1 className="text-4xl sm:text-5xl font-light uppercase tracking-widest text-[#0A0A0A] mb-4">
          Page Not Located
        </h1>
        <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed max-w-md mx-auto mb-8">
          The requested URL does not correspond to an active hardware page or collection. 
          Use the quick links below to redirect to popular departments.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.slice(0, 5).map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.id}`}
              className="bg-[#F7F7F7] border border-[#EAEAEA] hover:border-[#0A0A0A] text-xs font-medium text-[#0A0A0A] px-3.5 py-2 rounded-[4px] transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-[4px] hover:bg-[#FF4D00] transition-colors"
        >
          Return to Storefront <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
