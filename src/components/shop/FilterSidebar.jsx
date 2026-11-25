import React, { useState } from 'react';
import { Search, X, RotateCcw, Star, Check } from 'lucide-react';
import { useCategories } from '../../hooks/useCatalog';
import { formatMoney } from '../../utils/formatters';
import { brands } from '../../data/brands';

export default function FilterSidebar({
  selectedCategory,
  onSelectCategory,
  selectedBrands,
  onToggleBrand,
  priceRange,
  onChangePriceRange,
  minRating,
  onSelectRating,
  inStockOnly,
  onToggleInStock,
  onResetFilters,
  totalProductsCount
}) {
  const { data: categories = [] } = useCategories();
  const [brandSearch, setBrandSearch] = useState('');

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <aside className="space-y-6 divide-y divide-[#EAEAEA] text-xs">
      
      {/* Header and Reset */}
      <div className="pb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#0A0A0A]">
            Filters
          </span>
          <span className="text-[11px] text-[#6B6B6B] ml-2 tabular-nums">
            ({totalProductsCount} items)
          </span>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-[11px] text-[#6B6B6B] hover:text-[#FF4D00] flex items-center gap-1 transition-colors uppercase tracking-wider"
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      {/* Category Section */}
      <div className="pt-5 space-y-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#0A0A0A]">
          Department
        </h4>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`w-full text-left py-1.5 px-2 rounded-[2px] transition-colors flex items-center justify-between ${
              selectedCategory === 'all'
                ? 'bg-[#0A0A0A] text-white font-semibold'
                : 'text-[#6B6B6B] hover:bg-[#F7F7F7] hover:text-[#0A0A0A]'
            }`}
          >
            <span>All Departments</span>
            <span className="text-[10px] opacity-75 tabular-nums">{totalProductsCount}</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full text-left py-1.5 px-2 rounded-[2px] transition-colors flex items-center justify-between ${
                selectedCategory === cat.id
                  ? 'bg-[#0A0A0A] text-white font-semibold'
                  : 'text-[#6B6B6B] hover:bg-[#F7F7F7] hover:text-[#0A0A0A]'
              }`}
            >
              <span className="truncate pr-2">{cat.name}</span>
              <span className="text-[10px] opacity-75 tabular-nums">{cat.itemCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brand Section */}
      <div className="pt-5 space-y-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#0A0A0A]">
          Brand
        </h4>
        
        {/* Brand search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search brands..."
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            className="w-full bg-[#F7F7F7] border border-[#EAEAEA] text-[11px] text-[#0A0A0A] pl-7 pr-3 py-1.5 rounded-[2px] outline-none focus:border-[#0A0A0A]"
          />
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
          {filteredBrands.map((brand) => {
            const isChecked = selectedBrands.includes(brand.name);
            return (
              <label
                key={brand.id}
                className="flex items-center gap-2 py-1 px-1 rounded cursor-pointer hover:bg-[#F7F7F7] transition-colors text-[#6B6B6B] hover:text-[#0A0A0A]"
              >
                <div className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center transition-colors ${
                  isChecked 
                    ? 'bg-[#0A0A0A] border-[#0A0A0A] text-white' 
                    : 'border-[#D4D4D4] bg-white'
                }`}>
                  {isChecked && <Check size={10} className="stroke-[3]" />}
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleBrand(brand.name)}
                  className="sr-only"
                />
                <span className="truncate flex-1">{brand.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price Range Slider */}
      <div className="pt-5 space-y-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#0A0A0A]">
          Price Range (₹)
        </h4>

        <div>
          <input
            type="range"
            min={0}
            max={8000000}
            step={50000}
            value={priceRange[1]}
            onChange={(e) => onChangePriceRange([priceRange[0], Number(e.target.value)])}
            className="w-full accent-[#FF4D00] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] mt-2 font-mono tabular-nums">
            <span>{formatMoney(priceRange[0])}</span>
            <span className="font-semibold text-[#0A0A0A]">Up to {formatMoney(priceRange[1])}</span>
          </div>
        </div>
      </div>

      {/* Customer Rating Filter */}
      <div className="pt-5 space-y-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#0A0A0A]">
          Customer Rating
        </h4>

        <div className="space-y-1.5">
          {[
            { label: 'All Ratings', value: 0 },
            { label: '4.5 ★ & above', value: 4.5 },
            { label: '4.0 ★ & above', value: 4.0 }
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onSelectRating(item.value)}
              className={`w-full text-left py-1.5 px-2 rounded-[2px] transition-colors flex items-center justify-between ${
                minRating === item.value 
                  ? 'bg-[#F7F7F7] text-[#0A0A0A] font-semibold border border-[#EAEAEA]' 
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {item.value > 0 && <Star size={12} className="fill-amber-400 text-amber-400" />}
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Availability / In-Stock */}
      <div className="pt-5">
        <label className="flex items-center justify-between cursor-pointer py-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0A0A0A]">
            In Stock Only
          </span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={onToggleInStock}
            className="w-4 h-4 accent-[#FF4D00] rounded cursor-pointer"
          />
        </label>
      </div>

    </aside>
  );
}
