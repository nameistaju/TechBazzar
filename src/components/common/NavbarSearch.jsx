// src/components/common/NavbarSearch.jsx
import React, { useState, useRef, useEffect, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  X, 
  ArrowRight, 
  History, 
  TrendingUp, 
  FolderTree, 
  RefreshCw
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { categories } from '../../data/categories';

export default function NavbarSearch({ isMobileModalOpen, onCloseMobileModal }) {
  const { mode } = useStore();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listboxId = useId();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('techbazaar_recent_searches');
      return saved ? JSON.parse(saved) : ['Sony WH-1000XM5', 'boAt Airdopes', 'Apple Watch', 'Power Bank'];
    } catch {
      return ['Sony WH-1000XM5', 'boAt Airdopes', 'Apple Watch'];
    }
  });

  const popularSearches = ['Earbuds', 'ANC Headphones', 'Type-C Cable', 'MagSafe', 'Titanium Watch'];

  // Top 4 categories for empty state
  const topCategories = categories.slice(0, 4);

  // 200ms Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Global Keyboard shortcut (/ or Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // TanStack Query for Search Suggestions
  const {
    data: searchData,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['navbar-suggest', debouncedQuery, mode],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { suggestions: [], total: 0 };
      }
      const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(debouncedQuery)}&mode=${mode}&limit=6`);
      if (!res.ok) throw new Error('Failed to fetch suggestions');
      const json = await res.json();
      return json.data || { suggestions: [], total: 0 };
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev
  });

  const suggestions = searchData?.suggestions || [];
  const totalMatches = searchData?.total || 0;

  // Extract matching categories & brands
  const matchedCategories = debouncedQuery.length >= 2
    ? categories.filter(c => c.name.toLowerCase().includes(debouncedQuery.toLowerCase())).slice(0, 3)
    : [];

  const matchedBrands = debouncedQuery.length >= 2
    ? Array.from(new Set(suggestions.map(s => s.brand))).slice(0, 3)
    : [];

  const handleSaveRecentSearch = (term) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    const updated = [cleaned, ...recentSearches.filter(s => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('techbazaar_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const handleClearRecents = () => {
    setRecentSearches([]);
    localStorage.removeItem('techbazaar_recent_searches');
  };

  const executeSearch = (searchTerm) => {
    const target = searchTerm || query;
    if (!target.trim()) return;
    handleSaveRecentSearch(target);
    setIsOpen(false);
    onCloseMobileModal?.();
    navigate(`/search?q=${encodeURIComponent(target.trim())}`);
  };

  // Keyboard navigation inside dropdown
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        const item = suggestions[selectedIndex];
        setIsOpen(false);
        onCloseMobileModal?.();
        navigate(`/product/${item.id}`);
      } else {
        executeSearch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      onCloseMobileModal?.();
      inputRef.current?.blur();
    }
  };

  // Highlight matched terms
  const highlightMatch = (text, term) => {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="text-pop font-bold underline decoration-pop/30">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP EXPANDED SEARCH FIELD (min 280px -> 420px)    */}
      {/* ======================================================== */}
      <div ref={dropdownRef} className="relative hidden md:block shrink-0">
        <form
          role="search"
          onSubmit={(e) => { e.preventDefault(); executeSearch(); }}
          className="relative"
        >
          <div
            className={`flex items-center h-10 px-3 bg-[#F7F7F7] border transition-all duration-200 rounded-[2px] ${
              isOpen
                ? 'border-[#0A0A0A] bg-white ring-1 ring-[#0A0A0A] w-60 lg:w-[300px] xl:w-[360px] shadow-sm'
                : 'border-[#EAEAEA] hover:border-[#D4D4D4] w-48 lg:w-64 xl:w-72'
            }`}
          >
            <Search className="w-4 h-4 text-[#8A8A8A] shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={selectedIndex >= 0 ? `suggest-item-${selectedIndex}` : undefined}
              placeholder="Search products, SKU, brand..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs text-[#0A0A0A] placeholder-[#8A8A8A] outline-none"
            />

            {query ? (
              <button
                type="button"
                onClick={() => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus(); }}
                className="text-[#8A8A8A] hover:text-[#0A0A0A] p-0.5"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-[#EAEAEA] text-[10px] font-mono text-[#8A8A8A] rounded-[2px] shrink-0 select-none">
                /
              </kbd>
            )}
          </div>
        </form>

        {/* ======================================================== */}
        {/* DESKTOP SUGGESTIONS PANEL (min 560px, max 720px)         */}
        {/* ======================================================== */}
        {isOpen && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute top-full left-0 mt-1.5 w-[min(560px,calc(100vw-2rem))] lg:w-[min(640px,calc(100vw-2rem))] max-h-[70vh] bg-white border border-[#EAEAEA] shadow-[0_16px_40px_rgba(0,0,0,0.12)] rounded-[4px] z-50 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 divide-y divide-[#F0F0F0]"
          >
            {/* STATE A: EMPTY STATE (Focused, Query < 2 chars) */}
            {debouncedQuery.length < 2 && (
              <div className="p-4 space-y-4">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#8A8A8A] mb-2 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        <span>Recent Searches</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearRecents}
                        className="text-[10px] text-[#A1A1AA] hover:text-red-600 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => { setQuery(term); executeSearch(term); }}
                          className="px-2.5 py-1 bg-[#F7F7F7] hover:bg-[#EAEAEA] text-xs text-[#0A0A0A] rounded-[2px] transition-colors flex items-center gap-1 font-medium"
                        >
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Searches */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#8A8A8A] mb-2 font-semibold">
                    <TrendingUp className="w-3.5 h-3.5 text-pop" />
                    <span>Popular Gadget Terms</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {popularSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => { setQuery(term); executeSearch(term); }}
                        className="px-2.5 py-1 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] hover:bg-[#F7F7F7] text-xs text-[#0A0A0A] rounded-[2px] transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Top Categories Grid (4 items) */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#8A8A8A] mb-2 font-semibold">
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>Top Categories</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {topCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/shop?category=${cat.id}`}
                        onClick={() => setIsOpen(false)}
                        className="p-2 border border-[#EAEAEA] hover:border-[#0A0A0A] hover:bg-[#F7F7F7] rounded-[2px] text-center transition-all group"
                      >
                        <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center">
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="text-[11px] font-medium text-[#0A0A0A] truncate">
                          {cat.name}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STATE B: WHILE TYPING (Query >= 2 chars) */}
            {debouncedQuery.length >= 2 && (
              <>
                {/* Loading Skeleton */}
                {isLoading && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#8A8A8A]">
                      <span>Searching catalog for "{debouncedQuery}"...</span>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-pop" />
                    </div>
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 bg-[#EAEAEA] rounded-[2px]" />
                        <div className="flex-1 space-y-1.5">
                          <div className="w-2/3 h-3 bg-[#EAEAEA] rounded" />
                          <div className="w-1/3 h-2.5 bg-[#F2F2F2] rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error State */}
                {isError && (
                  <div className="p-4 text-center text-xs text-red-600 flex items-center justify-center gap-2">
                    <span>Can't load suggestions.</span>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="underline font-semibold hover:text-red-700"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Products List (up to 6 rows) */}
                {!isLoading && suggestions.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-[#FAFAFA] flex items-center justify-between text-[11px] font-mono uppercase text-[#8A8A8A] font-semibold border-b border-[#F0F0F0]">
                      <span>Matching Products ({totalMatches})</span>
                      <span className="text-[10px] text-pop font-normal">Use ↑↓ to navigate</span>
                    </div>

                    <div className="divide-y divide-[#F7F7F7]">
                      {suggestions.map((p, idx) => {
                        const isSelected = selectedIndex === idx;
                        return (
                          <Link
                            key={p.id}
                            id={`suggest-item-${idx}`}
                            role="option"
                            aria-selected={isSelected}
                            to={`/product/${p.id}`}
                            onClick={() => {
                              handleSaveRecentSearch(debouncedQuery);
                              setIsOpen(false);
                            }}
                            className={`flex items-center gap-3.5 px-4 py-2.5 transition-colors group ${
                              isSelected ? 'bg-[#F2F2F2]' : 'hover:bg-[#F7F7F7]'
                            }`}
                          >
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-10 object-contain bg-white border border-[#EAEAEA] p-0.5 rounded-[2px] shrink-0 group-hover:scale-105 transition-transform"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-[#0A0A0A] truncate">
                                {highlightMatch(p.name, debouncedQuery)}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#6B6B6B]">
                                <span className="font-mono text-[10px] text-[#8A8A8A]">{p.sku}</span>
                                <span>•</span>
                                <span className="text-[10px] px-1 bg-[#F2F2F2] rounded text-[#4A4A4A] uppercase font-mono">
                                  {p.brand}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-[#0A0A0A] tabular-nums">
                                ₹{Number(p.price || 0).toLocaleString('en-IN')}
                              </div>
                              {mode === 'wholesale' ? (
                                <span className="text-[10px] font-mono text-pop font-semibold">
                                  MOQ: {p.moq || 1}
                                </span>
                              ) : (
                                p.originalPrice > p.price && (
                                  <span className="text-[10px] text-[#8A8A8A] line-through tabular-nums">
                                    ₹{Number(p.originalPrice).toLocaleString('en-IN')}
                                  </span>
                                )
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Related Categories & Brands */}
                {!isLoading && (matchedCategories.length > 0 || matchedBrands.length > 0) && (
                  <div className="p-3 bg-[#FBFBFB] flex flex-wrap items-center gap-3 text-xs">
                    {matchedCategories.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono uppercase text-[#8A8A8A]">Categories:</span>
                        {matchedCategories.map(cat => (
                          <Link
                            key={cat.id}
                            to={`/shop?category=${cat.id}`}
                            onClick={() => setIsOpen(false)}
                            className="px-2 py-0.5 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] rounded text-[11px] text-[#0A0A0A]"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                    {matchedBrands.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono uppercase text-[#8A8A8A]">Brands:</span>
                        {matchedBrands.map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => { setQuery(b); executeSearch(b); }}
                            className="px-2 py-0.5 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] rounded text-[11px] text-[#0A0A0A]"
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* STATE C: NO RESULTS */}
                {!isLoading && suggestions.length === 0 && (
                  <div className="p-6 text-center space-y-3">
                    <p className="text-xs text-[#6B6B6B]">
                      No matching products found for <span className="font-semibold text-[#0A0A0A]">"{debouncedQuery}"</span>
                    </p>
                    <p className="text-[11px] text-[#8A8A8A]">
                      Try checking spelling or exploring popular categories below:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      {topCategories.map(c => (
                        <Link
                          key={c.id}
                          to={`/shop?category=${c.id}`}
                          onClick={() => setIsOpen(false)}
                          className="px-2.5 py-1 bg-[#F7F7F7] hover:bg-[#EAEAEA] text-xs text-[#0A0A0A] rounded-[2px]"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer: "See all N results" */}
                {totalMatches > 0 && (
                  <button
                    type="button"
                    onClick={() => executeSearch()}
                    className="w-full px-4 py-2.5 bg-white hover:bg-pop/5 text-xs text-pop font-semibold transition-colors flex items-center justify-center gap-1.5 border-t border-[#F0F0F0]"
                  >
                    <span>See all {totalMatches} results for "{debouncedQuery}"</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. MOBILE FULL-SCREEN SEARCH MODAL (large 44px targets)  */}
      {/* ======================================================== */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden animate-in fade-in duration-150">
          {/* Sticky Mobile Search Header */}
          <div className="h-16 border-b border-[#EAEAEA] px-4 flex items-center gap-3 shrink-0">
            <Search className="w-5 h-5 text-[#8A8A8A] shrink-0" />
            <input
              ref={mobileInputRef}
              type="text"
              autoFocus
              placeholder="Search products, SKU, brand..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
              className="flex-1 text-sm text-[#0A0A0A] outline-none h-11"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setDebouncedQuery(''); }}
                className="p-2 text-[#8A8A8A]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onCloseMobileModal}
              className="text-xs font-semibold uppercase text-[#0A0A0A] p-2"
            >
              Cancel
            </button>
          </div>

          {/* Mobile Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {debouncedQuery.length < 2 ? (
              <div className="space-y-4">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono uppercase text-[#8A8A8A] mb-2 font-semibold">
                      <span>Recent Searches</span>
                      <button onClick={handleClearRecents} className="text-[11px] text-red-600">Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map(term => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => { setQuery(term); executeSearch(term); }}
                          className="px-3 py-2 bg-[#F7F7F7] text-xs font-medium rounded min-h-[44px] flex items-center"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-mono uppercase text-[#8A8A8A] mb-2 font-semibold">Top Categories</div>
                  <div className="grid grid-cols-2 gap-2">
                    {topCategories.map(cat => (
                      <Link
                        key={cat.id}
                        to={`/shop?category=${cat.id}`}
                        onClick={onCloseMobileModal}
                        className="p-3 border border-[#EAEAEA] rounded flex items-center gap-2 min-h-[44px]"
                      >
                        <img src={cat.image} alt={cat.name} className="w-6 h-6 object-contain" />
                        <span className="text-xs font-medium text-[#0A0A0A] truncate">{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {suggestions.map(p => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    onClick={() => { handleSaveRecentSearch(debouncedQuery); onCloseMobileModal?.(); }}
                    className="flex items-center gap-3 py-3 border-b border-[#F0F0F0] min-h-[56px]"
                  >
                    <img src={p.image} alt={p.name} className="w-12 h-12 object-contain border border-[#EAEAEA] rounded p-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#0A0A0A] truncate">{p.name}</div>
                      <div className="text-[11px] text-[#6B6B6B]">{p.brand} • <span className="font-mono text-[#8A8A8A]">{p.sku}</span></div>
                    </div>
                    <div className="text-right shrink-0 font-bold text-xs">
                      ₹{Number(p.price || 0).toLocaleString('en-IN')}
                    </div>
                  </Link>
                ))}
                {totalMatches > 0 && (
                  <button
                    type="button"
                    onClick={() => executeSearch()}
                    className="w-full py-3.5 mt-3 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-wider rounded"
                  >
                    See all {totalMatches} results
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
