import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import productsApi from '@shared/api/productsApi';
import ProductCard from '@shared/ui/ProductCard';
import Breadcrumbs from '@shared/ui/Breadcrumbs';
import { Search, ArrowRight } from 'lucide-react';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [currentSort, setCurrentSort] = useState('popularity');

  const { data: searchData, isLoading: _isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const res = query.trim()
        ? await productsApi.searchProducts(query.trim())
        : await productsApi.getProducts({ limit: 48 });
      return res.data?.products || [];
    },
    staleTime: 60 * 1000
  });

  const filtered = searchData || [];

  const sorted = [...filtered].sort((a, b) => {
    if (currentSort === 'price-low') return a.price - b.price;
    if (currentSort === 'price-high') return b.price - a.price;
    if (currentSort === 'rating') return b.rating - a.rating;
    return b.reviewsCount - a.reviewsCount;
  });

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        <Breadcrumbs items={[{ label: `Search: "${query}"` }]} />

        <div className="py-6 border-b border-[#EAEAEA] mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent-text font-bold block mb-1">
              Search Results
            </span>
            <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A]">
              Results for "{query}"
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-1 tabular-nums">
              Found {filtered.length} products matching your query
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B6B6B]">Sort by:</span>
            <select
              value={currentSort}
              onChange={(e) => setCurrentSort(e.target.value)}
              className="bg-white border border-[#EAEAEA] text-xs font-medium text-[#0A0A0A] px-3 py-2 rounded-[4px] outline-none"
            >
              <option value="popularity">Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-20 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] p-8 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#9E9E9E] mx-auto mb-4 shadow-sm">
              <Search size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">
              No results found for "{query}"
            </h2>
            <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto mb-6">
              Check for typos or try searching with generic terms like "earbuds", "watch", "charger", or "cables".
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-[#0A0A0A] text-accent-contrast text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-[4px] hover:bg-accent transition-colors"
            >
              Browse All Products <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {sorted.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
