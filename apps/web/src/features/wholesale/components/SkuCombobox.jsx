// src/components/quickOrder/SkuCombobox.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { 
  X, 
  Plus 
} from 'lucide-react';
import productsApi from '@shared/api/productsApi';
import { formatINR } from '@shared/utils/formatters';

function HighlightMatch({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const clean = query.replace(/[^\w\s-]/g, '').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-orange-100 text-[#FF4D00] font-semibold rounded-[2px] px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function SkuCombobox({
  value = '',
  rowId,
  onChange,
  onSelectProduct,
  onAddMultiple,
  onFocusNext,
  existingSkus = new Set(),
  mode = 'retail',
  _isApprovedWholesale = false,
  placeholder = 'e.g. TB-CAB-0001, ear buds, boat...'
}) {
  const [inputValue, setInputValue] = useState(value);
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedIds, setSelectedIds] = useState([]);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync internal input when parent value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounce input by 200ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Query suggestions via TanStack Query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['productSuggestions', debouncedQuery.trim().toLowerCase(), mode],
    queryFn: async () => {
      const res = await productsApi.getSuggestions({
        q: debouncedQuery.trim(),
        mode,
        limit: 50
      });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData
  });

  const suggestions = data?.suggestions || [];
  const totalMatches = data?.total || 0;

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-combobox-item]');
      if (items[activeIndex]) {
        items[activeIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    if (val.trim().length >= 2) {
      setIsOpen(true);
      setActiveIndex(-1);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelectSingle = (prod) => {
    if (!prod || prod.stockStatus === 'out_of_stock') return;
    onSelectProduct(prod);
    setInputValue(prod.sku);
    setIsOpen(false);
    setActiveIndex(-1);
    setSelectedIds([]);
    if (onFocusNext) {
      setTimeout(() => onFocusNext(), 50);
    }
  };

  const toggleSelectMulti = (prodId, e) => {
    e?.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(prodId) ? prev.filter(id => id !== prodId) : [...prev, prodId]
    );
  };

  const handleCommitMultiSelect = () => {
    if (selectedIds.length === 0) return;
    const prodsToAdd = suggestions.filter(s => selectedIds.includes(s.id) && s.stockStatus !== 'out_of_stock');
    if (prodsToAdd.length > 0 && onAddMultiple) {
      onAddMultiple(prodsToAdd);
    }
    setSelectedIds([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (inputValue.trim().length >= 2) {
          setIsOpen(true);
          e.preventDefault();
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey && activeIndex >= 0 && suggestions[activeIndex]) {
        // Toggle multi-select checkbox on Shift+Enter
        toggleSelectMulti(suggestions[activeIndex].id);
      } else if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelectSingle(suggestions[activeIndex]);
      } else if (suggestions.length === 1) {
        handleSelectSingle(suggestions[0]);
      }
    } else if (e.key === 'Tab') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        handleSelectSingle(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleCategoryQuickSearch = (catName) => {
    setInputValue(catName);
    onChange(catName);
    inputRef.current?.focus();
  };

  const shouldShowDropdown = isOpen && inputValue.trim().length >= 2;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Combobox Search Input */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={shouldShowDropdown}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={`combobox-list-${rowId}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full px-2.5 py-1.5 pr-7 border border-[#EAEAEA] rounded bg-white font-mono text-xs outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-all"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              onChange('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 text-[#8A8A8A] hover:text-[#0A0A0A] transition-colors p-0.5"
            tabIndex={-1}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Desktop / Tablet Dropdown Popover */}
      {shouldShowDropdown && (
        <div 
          id={`combobox-list-${rowId}`}
          role="listbox"
          className="hidden md:flex flex-col absolute left-0 top-full mt-1 z-30 w-full min-w-[340px] sm:min-w-[460px] lg:min-w-[520px] bg-white border border-[#EAEAEA] shadow-xl rounded-[4px] overflow-hidden animate-fade-in"
        >
          {/* Header bar with Count & Mode Indicator */}
          <div className="px-3 py-2 bg-[#F9F9F9] border-b border-[#EAEAEA] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#6B6B6B]">
              {isLoading ? (
                'Searching products...'
              ) : (
                <>
                  <span className="font-bold text-[#0A0A0A]">{totalMatches}</span> {totalMatches === 1 ? 'product' : 'products'} found
                </>
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8A8A8A] hidden sm:inline">
                ↑↓ to navigate • Enter to select • Shift+Enter to check
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider ${
                mode === 'wholesale' ? 'bg-[#0A0A0A] text-[#FF4D00]' : 'bg-gray-200 text-[#0A0A0A]'
              }`}>
                {mode === 'wholesale' ? 'Wholesale' : 'Retail'}
              </span>
            </div>
          </div>

          {/* Results List */}
          <div ref={listRef} className="max-h-[340px] overflow-y-auto divide-y divide-[#F2F2F2]">
            {isLoading && (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map(k => (
                  <div key={k} className="flex items-center gap-2.5 animate-pulse">
                    <div className="w-9 h-9 bg-gray-100 rounded shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-red-500 font-mono">Can't load suggestions.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-3 py-1 bg-[#0A0A0A] text-white text-[10px] font-mono uppercase font-semibold rounded hover:bg-[#FF4D00]"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !isError && suggestions.length === 0 && (
              <div className="p-5 text-center space-y-3">
                <p className="text-xs text-[#6B6B6B]">
                  No products match <span className="font-semibold text-[#0A0A0A]">"{debouncedQuery}"</span>
                </p>
                <div className="text-[11px] text-[#8A8A8A] space-y-1.5">
                  <span>Browse popular categories:</span>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {['Earbuds', 'Power Banks', 'Headphones', 'Smartwatches'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryQuickSearch(cat)}
                        className="px-2 py-0.5 border border-[#EAEAEA] bg-[#FAFAFA] hover:border-[#FF4D00] hover:text-[#FF4D00] text-xs font-mono rounded transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !isError && suggestions.map((item, idx) => {
              const isActive = activeIndex === idx;
              const isChecked = selectedIds.includes(item.id);
              const isAlreadyAdded = existingSkus.has(item.sku?.toLowerCase());
              const isOutOfStock = item.stockStatus === 'out_of_stock';
              const isLowStock = item.stockStatus === 'low_stock';

              return (
                <div
                  key={item.id}
                  data-combobox-item
                  role="option"
                  aria-selected={isActive}
                  onClick={() => !isOutOfStock && handleSelectSingle(item)}
                  className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isOutOfStock
                      ? 'opacity-45 bg-gray-50 cursor-not-allowed'
                      : isActive
                        ? 'bg-orange-50/70 border-l-2 border-[#FF4D00]'
                        : 'hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Checkbox for Multi-Select */}
                    <input
                      type="checkbox"
                      disabled={isOutOfStock}
                      checked={isChecked}
                      onChange={(e) => toggleSelectMulti(item.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded border-[#EAEAEA] text-[#FF4D00] focus:ring-0 cursor-pointer shrink-0"
                    />

                    {/* Image Thumbnail */}
                    <img
                      src={item.image || '/images/placeholder-product.svg'}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/placeholder-product.svg';
                      }}
                      className="w-9 h-9 object-contain bg-white border border-[#EAEAEA] rounded p-0.5 shrink-0"
                    />

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#0A0A0A] line-clamp-1">
                          <HighlightMatch text={item.name} query={debouncedQuery} />
                        </span>
                        {isAlreadyAdded && (
                          <span className="px-1.5 py-0.2 bg-gray-100 text-[#0A0A0A] text-[9px] font-mono font-bold rounded uppercase shrink-0">
                            Already added
                          </span>
                        )}
                        {isLowStock && (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-mono font-bold rounded uppercase shrink-0">
                            Only {item.stock} left
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="px-1.5 py-0.2 bg-red-50 text-red-600 border border-red-200 text-[9px] font-mono font-bold rounded uppercase shrink-0">
                            Out of stock
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-[#6B6B6B]">
                        <span>{item.brand}</span>
                        <span>•</span>
                        <span className="text-[#0A0A0A] font-medium">{item.sku}</span>
                        <span>•</span>
                        <span>MOQ: {item.moq}</span>
                        <span>•</span>
                        <span>Pack: {item.packSize}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing info */}
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-xs font-bold font-mono text-[#0A0A0A]">
                      {formatINR(item.price)}
                    </div>
                    {item.mrp && item.mrp > item.price && (
                      <div className="text-[10px] font-mono text-[#8A8A8A] line-through">
                        {formatINR(item.mrp)}
                      </div>
                    )}
                    <div className="text-[9px] font-mono text-[#FF4D00]">
                      {mode === 'wholesale' ? 'Tier 1' : 'Retail'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Multi-Select Commit Footer */}
          {selectedIds.length > 0 && (
            <div className="p-2.5 bg-gray-50 border-t border-[#EAEAEA] flex items-center justify-between gap-2">
              <div className="text-xs font-mono text-[#0A0A0A]">
                <span className="font-bold text-[#FF4D00]">{selectedIds.length}</span> items selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] font-mono text-[#6B6B6B] hover:text-[#0A0A0A] underline"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleCommitMultiSelect}
                  className="px-3 py-1.5 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-mono uppercase font-semibold transition-colors flex items-center gap-1.5 rounded-[3px]"
                >
                  <Plus size={13} />
                  Add {selectedIds.length} Selected
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Bottom Sheet (< 768px) */}
      {shouldShowDropdown && typeof document !== 'undefined' && createPortal(
        <div className="md:hidden fixed inset-0 bg-black/60 z-50 flex flex-col justify-end p-0 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-xl border-t border-[#0A0A0A] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Sheet Header */}
            <div className="p-3 border-b border-[#EAEAEA] flex items-center justify-between bg-[#F9F9F9]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-[#0A0A0A]">
                  Select Product ({totalMatches})
                </span>
                <span className="text-[10px] text-[#FF4D00] font-mono uppercase font-semibold">
                  {mode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Scrollable Results List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F2F2F2] p-2">
              {isLoading && (
                <div className="p-4 text-center text-xs font-mono text-[#6B6B6B]">
                  Searching products...
                </div>
              )}

              {!isLoading && suggestions.length === 0 && (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-[#6B6B6B]">No products match "{debouncedQuery}"</p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                    {['Earbuds', 'Power Banks', 'Headphones'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCategoryQuickSearch(c)}
                        className="px-2.5 py-1 border border-[#EAEAEA] text-xs font-mono rounded"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isLoading && suggestions.map((item) => {
                const isChecked = selectedIds.includes(item.id);
                const isOutOfStock = item.stockStatus === 'out_of_stock';

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && handleSelectSingle(item)}
                    className="p-3 flex items-center justify-between gap-3 active:bg-orange-50/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        disabled={isOutOfStock}
                        checked={isChecked}
                        onChange={(e) => toggleSelectMulti(item.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded text-[#FF4D00]"
                      />
                      <img
                        src={item.image}
                        alt=""
                        className="w-10 h-10 object-contain bg-white border border-[#EAEAEA] rounded p-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#0A0A0A] line-clamp-1">
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono text-[#6B6B6B] mt-0.5">
                          {item.sku} • MOQ: {item.moq}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono text-[#0A0A0A]">
                        {formatINR(item.price)}
                      </div>
                      <div className="text-[9px] font-mono text-[#FF4D00]">
                        {mode === 'wholesale' ? 'Tier 1' : 'Retail'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Footer */}
            {selectedIds.length > 0 ? (
              <div className="p-3 bg-gray-50 border-t border-[#EAEAEA] flex items-center justify-between">
                <span className="text-xs font-mono">{selectedIds.length} selected</span>
                <button
                  type="button"
                  onClick={handleCommitMultiSelect}
                  className="px-4 py-2 bg-[#FF4D00] text-white text-xs font-mono font-bold uppercase rounded"
                >
                  Add {selectedIds.length} Selected
                </button>
              </div>
            ) : (
              <div className="p-3 border-t border-[#EAEAEA] bg-white text-center">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 bg-[#0A0A0A] text-white text-xs font-mono uppercase font-semibold rounded"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
