import React from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  ChevronDown,
  LayoutDashboard,
  Sparkles,
  Heart,
  PackageCheck,
  LogOut
} from 'lucide-react';

export default function NavbarAccountMenu({
  accountRef,
  isAuthenticated,
  user,
  isAccountDropdownOpen,
  setIsAccountDropdownOpen,
  logout,
  openAuthModal
}) {
  return (
    <div ref={accountRef} className="relative">
      {isAuthenticated ? (
        <div>
          <button
            type="button"
            onClick={() => setIsAccountDropdownOpen(prev => !prev)}
            className="flex items-center gap-1.5 p-1 text-[#0A0A0A] hover:text-accent-text transition-colors text-xs font-semibold uppercase tracking-wider"
            aria-label="User Account Menu"
          >
            <div className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-[11px] font-bold uppercase shrink-0">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <ChevronDown size={12} className={`hidden lg:block transition-transform duration-150 ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Account Dropdown */}
          {isAccountDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-[#EAEAEA] shadow-xl rounded-[4px] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans">
              <div className="px-3 py-2 border-b border-[#F0F0F0]">
                <p className="text-xs font-semibold text-[#0A0A0A] truncate">{user.name}</p>
                <p className="text-[10px] text-[#8A8A8A] truncate">{user.email}</p>
              </div>

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setIsAccountDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-medium border-b border-[#F0F0F0]"
                >
                  <LayoutDashboard size={14} /> Admin Dashboard
                </Link>
              )}

              <Link
                to="/account"
                onClick={() => setIsAccountDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#0A0A0A] hover:bg-[#F7F7F7] transition-colors"
              >
                <User size={14} /> My Account & Orders
              </Link>

              <Link
                to="/quote"
                onClick={() => setIsAccountDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#0A0A0A] hover:bg-[#F7F7F7] transition-colors"
              >
                <Sparkles size={14} /> Quotes & RFQ
              </Link>

              <Link
                to="/wishlist"
                onClick={() => setIsAccountDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#0A0A0A] hover:bg-[#F7F7F7] transition-colors"
              >
                <Heart size={14} /> Saved Wishlist
              </Link>

              <Link
                to="/track"
                onClick={() => setIsAccountDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#0A0A0A] hover:bg-[#F7F7F7] transition-colors"
              >
                <PackageCheck size={14} /> Track Orders
              </Link>

              <button
                type="button"
                onClick={() => { setIsAccountDropdownOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left border-t border-[#F0F0F0]"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="p-1.5 text-[#0A0A0A] hover:text-accent-text transition-colors flex items-center gap-1.5"
          aria-label="Sign in"
        >
          <User size={19} strokeWidth={1.75} />
          <span className="hidden xl:inline text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
            Sign In
          </span>
        </button>
      )}
    </div>
  );
}
