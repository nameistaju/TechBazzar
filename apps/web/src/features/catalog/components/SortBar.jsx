import React from 'react';
import { LayoutGrid, List, Table as TableIcon, SlidersHorizontal, X } from 'lucide-react';

export default function SortBar({
  totalCount,
  currentSort,
  onChangeSort,
  viewMode,
  onChangeViewMode,
  activeFilterPills,
  onRemoveFilterPill,
  onOpenMobileFilters
}) {
  return (
    <div className="space-y-4 pb-4 border-b border-[#EAEAEA]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Results count & Mobile filter trigger button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:bg-[#EAEAEA] transition-colors"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>

          <span className="text-xs text-[#6B6B6B] tabular-nums">
            Showing <strong className="font-semibold text-[#0A0A0A]">{totalCount}</strong> products
          </span>
        </div>

        {/* Sort dropdown and Grid/List view toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B6B6B] hidden sm:inline uppercase tracking-wider text-[11px]">
              Sort by:
            </span>
            <select
              value={currentSort}
              onChange={(e) => onChangeSort(e.target.value)}
              className="bg-white border border-[#EAEAEA] text-xs font-medium text-[#0A0A0A] px-3 py-2 rounded-[4px] outline-none focus:border-[#0A0A0A] cursor-pointer"
            >
              <option value="popularity">Popularity / Curated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="hidden sm:flex items-center border border-[#EAEAEA] rounded-[4px] overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => onChangeViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-[#0A0A0A] text-white' 
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]'
              }`}
              title="Grid View"
              aria-label="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list' 
                  ? 'bg-[#0A0A0A] text-white' 
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]'
              }`}
              title="List View"
              aria-label="List view"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('table')}
              className={`p-2 transition-colors ${
                viewMode === 'table' 
                  ? 'bg-[#0A0A0A] text-white' 
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]'
              }`}
              title="Wholesale Table View"
              aria-label="Table view"
            >
              <TableIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Pills/Chips */}
      {activeFilterPills.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 pt-1">
          <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mr-1">
            Active Filters:
          </span>
          {activeFilterPills.map((pill) => (
            <span
              key={pill.id}
              className="inline-flex items-center gap-1.5 bg-[#F7F7F7] border border-[#EAEAEA] text-[#0A0A0A] text-[11px] font-medium px-2.5 py-1 rounded-[2px]"
            >
              <span>{pill.label}</span>
              <button
                type="button"
                onClick={() => onRemoveFilterPill(pill)}
                className="text-[#8A8A8A] hover:text-[#FF4D00] p-0.5 transition-colors"
                aria-label={`Remove filter ${pill.label}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
