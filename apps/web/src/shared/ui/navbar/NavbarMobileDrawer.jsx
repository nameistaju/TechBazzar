import React from 'react';
import { Link } from 'react-router-dom';
import { X, Zap, PackageCheck, LayoutDashboard, User } from 'lucide-react';
import { categories } from '@shared/data/categories';

export default function NavbarMobileDrawer({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  branding,
  mode,
  switchMode,
  user,
  isAuthenticated,
  logout,
  openAuthModal
}) {
  if (!isMobileMenuOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA]">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center" aria-label={branding.brand_name || 'Home'}>
              <img 
                src={branding.logo_wordmark || branding.logo_mark || '/logo.png'} 
                alt={branding.brand_name || 'Logo'} 
                className="h-9 w-auto object-contain" 
              />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A]"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile Mode Switcher */}
          <div className="my-3.5 p-1 rounded bg-[#F4F4F5] border border-[#E4E4E7] flex text-xs font-semibold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => { switchMode('retail'); setIsMobileMenuOpen(false); }}
              className={`flex-1 py-1.5 text-center rounded relative transition-colors ${
                mode === 'retail' ? 'bg-[#0A0A0A] text-white shadow-xs' : 'text-[#71717A]'
              }`}
            >
              <span>Retail</span>
            </button>
            <button
              type="button"
              onClick={() => { switchMode('wholesale'); setIsMobileMenuOpen(false); }}
              className={`flex-1 py-1.5 text-center rounded relative transition-colors flex items-center justify-center gap-1 ${
                mode === 'wholesale' ? 'bg-[#0A0A0A] text-white shadow-xs' : 'text-[#71717A]'
              }`}
            >
              <span>Wholesale</span>
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex flex-col gap-3 text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] pt-2">
            <Link to="/shop" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-pop py-1.5">
              All Products
            </Link>
            <Link to="/shop?flag=flashSale" onClick={() => setIsMobileMenuOpen(false)} className="text-pop py-1.5 flex items-center gap-1.5">
              <Zap size={14} /> Flash Sale
            </Link>
            <Link to="/quick-order" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-pop py-1.5">
              Quick Order Matrix
            </Link>
            <Link to="/quote" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-pop py-1.5">
              Request Bulk Quote
            </Link>
            <Link to="/track" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-pop py-1.5 flex items-center gap-1.5">
              <PackageCheck size={14} /> Track Order
            </Link>

            {user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-emerald-700 py-1.5 flex items-center gap-1.5 font-bold">
                <LayoutDashboard size={14} /> Admin Dashboard
              </Link>
            )}

            {/* Categories List in Mobile */}
            <div className="pt-3 border-t border-[#EAEAEA]">
              <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider block mb-2 font-mono">
                Catalog Categories
              </span>
              <div className="grid grid-cols-1 gap-1">
                {categories.slice(0, 8).map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/shop?category=${cat.id}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-xs text-[#4A4A4A] hover:text-[#0A0A0A] py-1 flex justify-between"
                  >
                    <span>{cat.name}</span>
                    <span className="text-[#8A8A8A] text-[10px]">({cat.itemCount})</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Mobile Footer Auth Action */}
        <div className="pt-4 border-t border-[#EAEAEA]">
          {isAuthenticated ? (
            <div className="space-y-2">
              <Link
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest rounded flex items-center justify-center gap-2"
              >
                <User size={14} /> My Account
              </Link>
              <button
                type="button"
                onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                className="w-full py-2 text-xs text-red-600 font-medium text-center"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen(false); openAuthModal('login'); }}
              className="w-full py-2.5 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest rounded flex items-center justify-center gap-2"
            >
              <User size={14} /> Sign In / Register
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
