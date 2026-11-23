import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/common/Breadcrumbs';
import FilterSidebar from '../components/shop/FilterSidebar';
import FilterDrawerMobile from '../components/shop/FilterDrawerMobile';
import SortBar from '../components/shop/SortBar';
import ProductCard from '../components/common/ProductCard';
import ProductListRow from '../components/shop/ProductListRow';
import { products } from '../data/products';
import { categories } from '../data/categories';
import { RotateCcw, PackageOpen } from 'lucide-react';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const initialCategory = searchParams.get('category') || 'all';
  const initialBrand = searchParams.get('brand');
  const initialSale = searchParams.get('sale') === 'true';
  const initialFilter = searchParams.get('filter'); // 'trending', 'recommended'

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrands, setSelectedBrands] = useState(
    initialBrand && initialBrand !== 'all' ? [initialBrand] : []
  );
  const [priceRange, setPriceRange] = useState([0, 80000]);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentSort, setCurrentSort] = useState('popularity');
  const [viewMode, setViewMode] = useState('grid');
  const [visibleCount, setVisibleCount] = useState(16);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sync state if URL search params change
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
    const br = searchParams.get('brand');
    if (br && br !== 'all') setSelectedBrands([br]);
    if (searchParams.get('sale') === 'true') {
      // Sale filter
    }
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedCategory]);

  // Handle category change
  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    setVisibleCount(16);
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  // Toggle brand
  const handleToggleBrand = (brandName) => {
    setVisibleCount(16);
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrands([]);
    setPriceRange([0, 80000]);
    setMinRating(0);
    setInStockOnly(false);
    setCurrentSort('popularity');
    setVisibleCount(16);
    setSearchParams({});
  };

  // Filter logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Brand filter
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) {
        return false;
      }
      // Price range
      if (p.price < priceRange[0] || p.price > priceRange[1]) {
        return false;
      }
      // Rating
      if (minRating > 0 && p.rating < minRating) {
        return false;
      }
      // Flash sale param
      if (initialSale && !p.isFlashSale) {
        return false;
      }
      // Trending param
      if (initialFilter === 'trending' && !p.isTrending) {
        return false;
      }
      // Recommended param
      if (initialFilter === 'recommended' && !p.isRecommended) {
        return false;
      }
      return true;
    });
  }, [selectedCategory, selectedBrands, priceRange, minRating, initialSale, initialFilter]);

  // Sort logic
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (currentSort) {
      case 'price-low':
        return list.sort((a, b) => a.price - b.price);
      case 'price-high':
        return list.sort((a, b) => b.price - a.price);
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      case 'newest':
        return list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      case 'popularity':
      default:
        return list.sort((a, b) => b.reviewsCount - a.reviewsCount);
    }
  }, [filteredProducts, currentSort]);

  const displayedProducts = sortedProducts.slice(0, visibleCount);

  // Active filter pills
  const activePills = [];
  if (selectedCategory !== 'all') {
    const catObj = categories.find((c) => c.id === selectedCategory);
    activePills.push({
      id: 'category',
      label: `Category: ${catObj ? catObj.name : selectedCategory}`,
      type: 'category'
    });
  }
  selectedBrands.forEach((b) => {
    activePills.push({ id: `brand-${b}`, label: `Brand: ${b}`, type: 'brand', value: b });
  });
  if (priceRange[1] < 80000) {
    activePills.push({
      id: 'price',
      label: `Max Price: ₹${priceRange[1].toLocaleString('en-IN')}`,
      type: 'price'
    });
  }
  if (minRating > 0) {
    activePills.push({ id: 'rating', label: `${minRating}★ & above`, type: 'rating' });
  }

  const handleRemovePill = (pill) => {
    if (pill.type === 'category') handleSelectCategory('all');
    if (pill.type === 'brand') handleToggleBrand(pill.value);
    if (pill.type === 'price') setPriceRange([0, 80000]);
    if (pill.type === 'rating') setMinRating(0);
  };

  const currentCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Shop', link: '/shop' },
            ...(currentCategoryObj ? [{ label: currentCategoryObj.name }] : [])
          ]}
        />

        {/* Page Title & Intro */}
        <div className="py-6 border-b border-[#EAEAEA] mb-8">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-bold block mb-1">
            Official Catalog
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light uppercase tracking-wide sm:tracking-widest text-[#0A0A0A]">
            {currentCategoryObj ? currentCategoryObj.name : 'All Electronics & Gadgets'}
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-2 max-w-xl leading-relaxed">
            {currentCategoryObj 
              ? currentCategoryObj.description 
              : 'Browse 150+ genuine gadgets across premium wireless acoustics, wearable computers, fast power reserves, and optical sensors.'}
          </p>
        </div>

        {/* Layout Grid: Sidebar + Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <FilterSidebar
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              selectedBrands={selectedBrands}
              onToggleBrand={handleToggleBrand}
              priceRange={priceRange}
              onChangePriceRange={setPriceRange}
              minRating={minRating}
              onSelectRating={setMinRating}
              inStockOnly={inStockOnly}
              onToggleInStock={() => setInStockOnly(!inStockOnly)}
              onResetFilters={handleResetFilters}
              totalProductsCount={filteredProducts.length}
            />
          </div>

          {/* Main Products Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Sort & Control Bar */}
            <SortBar
              totalCount={filteredProducts.length}
              currentSort={currentSort}
              onChangeSort={setCurrentSort}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              activeFilterPills={activePills}
              onRemoveFilterPill={handleRemovePill}
              onOpenMobileFilters={() => setIsMobileFilterOpen(true)}
            />

            {/* Product Grid / List Display */}
            {displayedProducts.length === 0 ? (
              <div className="py-20 text-center bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] p-8">
                <div className="w-14 h-14 mx-auto rounded-full bg-white flex items-center justify-center text-[#9E9E9E] mb-3 shadow-sm">
                  <PackageOpen size={26} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">No products match your criteria</h3>
                <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto mb-6">
                  Try widening your price range or clearing active brand filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-wider px-6 py-3 rounded-[4px] hover:bg-[#FF4D00] transition-colors inline-flex items-center gap-2"
                >
                  <RotateCcw size={13} /> Reset All Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displayedProducts.map((product) => (
                  <ProductListRow key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Load More Button */}
            {visibleCount < sortedProducts.length && (
              <div className="text-center pt-10">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="bg-white border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white text-xs font-semibold uppercase tracking-widest px-8 py-3.5 rounded-[4px] transition-colors shadow-sm"
                >
                  Load More Products ({sortedProducts.length - visibleCount} remaining)
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Mobile Filter Drawer */}
      <FilterDrawerMobile
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        selectedBrands={selectedBrands}
        onToggleBrand={handleToggleBrand}
        priceRange={priceRange}
        onChangePriceRange={setPriceRange}
        minRating={minRating}
        onSelectRating={setMinRating}
        inStockOnly={inStockOnly}
        onToggleInStock={() => setInStockOnly(!inStockOnly)}
        onResetFilters={handleResetFilters}
        totalProductsCount={filteredProducts.length}
      />
    </div>
  );
}
