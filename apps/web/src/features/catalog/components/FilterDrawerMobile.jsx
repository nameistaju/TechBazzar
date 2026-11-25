import React from 'react';
import { X, Check } from 'lucide-react';
import FilterSidebar from '@features/catalog/components/FilterSidebar';

export default function FilterDrawerMobile({
  isOpen,
  onClose,
  ...sidebarProps
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 max-w-full flex pr-10">
        <div className="w-screen max-w-xs bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-250">
          
          <div className="p-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#0A0A0A]">
              Filter Products
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <FilterSidebar {...sidebarProps} />
          </div>

          <div className="p-4 border-t border-[#EAEAEA] bg-[#FAFAFA]">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-semibold uppercase tracking-wider py-3 rounded-[4px] hover:bg-accent transition-colors flex items-center justify-center gap-2"
            >
              <Check size={14} /> Apply Filters
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
