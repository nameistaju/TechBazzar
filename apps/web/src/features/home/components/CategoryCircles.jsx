import React from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '@shared/hooks/useCatalog';
import { ArrowRight } from 'lucide-react';

export default function CategoryCircles() {
  const { data: categories = [] } = useCategories();
  return (
    <section className="py-12 border-b border-[#EAEAEA] bg-white">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#6B6B6B] font-semibold block mb-1">
              Curated Taxonomy
            </span>
            <h2 className="text-xl sm:text-2xl font-light uppercase tracking-widest text-[#0A0A0A]">
              Explore by Department
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-xs font-semibold text-[#0A0A0A] hover:text-[#FF4D00] transition-colors flex items-center gap-1 group uppercase tracking-wider"
          >
            All Departments <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Horizontal Category Row */}
        <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-thin no-scrollbar">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.id}`}
              className="flex flex-col items-center shrink-0 group text-center w-24 sm:w-28"
            >
              {/* Image Circle Container */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#F7F7F7] border border-[#EAEAEA] p-3 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-[#FF4D00] group-hover:shadow-[0_8px_20px_rgba(255,77,0,0.12)]">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Title & Count */}
              <div className="mt-3">
                <span className="block text-xs font-medium text-[#0A0A0A] group-hover:text-[#FF4D00] transition-colors line-clamp-1 leading-snug">
                  {cat.name}
                </span>
                <span className="text-[10px] text-[#8A8A8A] font-normal tabular-nums">
                  {cat.itemCount} items
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
