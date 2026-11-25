// src/components/common/Navbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Search, 
  Heart, 
  ShoppingBag, 
  Menu, 
  ChevronDown, 
  ArrowRight,
  Sparkles,
  Zap,
  MoreHorizontal,
  PackageCheck
} from 'lucide-react';
import { useStore } from '@app/providers/StoreContext';
import useAuthStore from '@shared/store/authStore';
import { categories } from '@shared/data/categories';
import NavbarSearch from '@shared/ui/navbar/NavbarSearch';
import NavbarAccountMenu from '@shared/ui/navbar/NavbarAccountMenu';
import NavbarMobileDrawer from '@shared/ui/navbar/NavbarMobileDrawer';
import { useBranding } from '@app/providers/BrandingContext';

export default function Navbar() {
  const { 
    cartCount, 
    otherCartCount, 
    mode, 
    switchMode, 
    wishlistCount, 
    setIsCartOpen, 
    cartBump 
  } = useStore();
  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();
  const { branding } = useBranding();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

  const megaMenuRef = useRef(null);
  const moreMenuRef = useRef(null);
  const accountRef = useRef(null);
  const location = useLocation();

  // Window width tracking for Priority+ navigation & responsive breakpoints
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll detection for sticky hairline border
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
    setIsMegaMenuOpen(false);
    setIsMoreMenuOpen(false);
    setIsAccountDropdownOpen(false);
  }, [location.pathname]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target)) {
        setIsMegaMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Priority+ Navigation Links:
  // Priority order for overflow into "More":
  // 1. Track (first to hide)
  // 2. RFQ / Quote
  // 3. Quick Order
  // 4. Flash Sale
  // 5. All Products
  // (Categories is ALWAYS visible)
  const navLinks = [
    { id: 'all', label: 'All Products', to: '/shop', priority: 5 },
    { id: 'flash', label: 'Flash Sale', to: '/shop?flag=flashSale', icon: Zap, isFlash: true, priority: 4 },
    { id: 'quick', label: 'Quick Order', to: '/quick-order', priority: 3 },
    { id: 'quote', label: 'RFQ / Quote', to: '/quote', priority: 2 },
    { id: 'track', label: 'Track', to: '/track', icon: PackageCheck, priority: 1 }
  ];

  // Calculate visible links vs overflow "More" links based on available width
  let minPriorityToDisplay = 1;
  if (windowWidth < 1120) {
    minPriorityToDisplay = 5; // Only All Products
  } else if (windowWidth < 1220) {
    minPriorityToDisplay = 4; // All Products + Flash Sale
  } else if (windowWidth < 1320) {
    minPriorityToDisplay = 3; // + Quick Order
  } else if (windowWidth < 1420) {
    minPriorityToDisplay = 2; // + RFQ / Quote
  } else {
    minPriorityToDisplay = 1; // All visible
  }

  const visibleLinks = navLinks.filter(l => l.priority >= minPriorityToDisplay);
  const overflowLinks = navLinks.filter(l => l.priority < minPriorityToDisplay);

  return (
    <header className={`sticky top-0 z-40 bg-white transition-all duration-200 border-b ${
      isScrolled ? 'border-[#EAEAEA] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'border-[#F0F0F0]'
    }`}>
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16 gap-3 lg:gap-4 select-none">
          
          {/* ======================================================== */}
          {/* 1. LEFT: MOBILE HAMBURGER + LOGO + MODE SWITCH           */}
          {/* ======================================================== */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Hamburger Drawer Trigger (< 1024px) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 -ml-1 text-[#0A0A0A] hover:text-pop transition-colors"
              aria-label="Open mobile navigation menu"
            >
              <Menu size={22} strokeWidth={1.75} />
            </button>

            {/* Brand Logo / Wordmark */}
            <Link to="/" className="flex items-center group shrink-0" aria-label={branding.brand_name || 'Home'}>
              {branding.use_text_wordmark ? (
                <div className="flex items-center gap-1.5">
                  <img 
                    src={branding.logo_mark || '/favicon.png'} 
                    alt="Logo" 
                    className="h-8 md:h-9 w-auto object-contain" 
                  />
                  <span className="font-mono text-sm md:text-base tracking-wider uppercase text-[#0A0A0A] group-hover:text-pop transition-colors">
                    {branding.use_split_name ? (
                      <>
                        <span className="font-light">{branding.brand_name_part1 || 'TECH'}</span>
                        <strong className="font-bold">{branding.brand_name_part2 || 'BAZAAR'}</strong>
                      </>
                    ) : (
                      <strong>{branding.brand_name || 'TechBazaar'}</strong>
                    )}
                  </span>
                </div>
              ) : (
                <img 
                  src={branding.logo_wordmark || branding.logo_mark || '/logo.png'} 
                  alt={branding.brand_name || 'TechBazaar'} 
                  className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105" 
                />
              )}
            </Link>

            {/* Retail | Wholesale Mode Switcher (Visible on >= 640px) */}
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] text-[11px] font-semibold tracking-wider uppercase shrink-0">
              <button
                type="button"
                onClick={() => switchMode('retail')}
                className={`px-2.5 py-0.5 rounded-full transition-all relative ${
                  mode === 'retail'
                    ? 'bg-[#0A0A0A] text-white shadow-xs'
                    : 'text-[#71717A] hover:text-[#0A0A0A]'
                }`}
              >
                <span>Retail</span>
                {mode === 'retail' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-pop rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => switchMode('wholesale')}
                className={`px-2.5 py-0.5 rounded-full transition-all relative flex items-center gap-1 ${
                  mode === 'wholesale'
                    ? 'bg-[#0A0A0A] text-white shadow-xs'
                    : 'text-[#71717A] hover:text-[#0A0A0A]'
                }`}
              >
                <span>Wholesale</span>
                {mode === 'wholesale' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-pop rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. CENTER-LEFT: PRIMARY LINKS + PRIORITY+ OVERFLOW (>=1024) */}
          {/* ======================================================== */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] shrink-0 whitespace-nowrap">
            {/* Always Visible: Categories Mega Menu */}
            <div 
              ref={megaMenuRef}
              className="relative"
              onMouseEnter={() => setIsMegaMenuOpen(true)}
              onMouseLeave={() => setIsMegaMenuOpen(false)}
            >
              <button 
                type="button"
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className="flex items-center gap-1 hover:text-pop transition-colors py-2"
              >
                <span>Categories</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Categories Mega Dropdown */}
              {isMegaMenuOpen && (
                <div className="absolute top-full -left-12 w-[680px] xl:w-[780px] bg-white border border-[#EAEAEA] shadow-[0_16px_36px_rgba(0,0,0,0.08)] p-5 z-50 rounded-[4px] grid grid-cols-3 gap-5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {categories.slice(0, 10).map((cat) => (
                      <Link 
                        key={cat.id} 
                        to={`/shop?category=${cat.id}`}
                        onClick={() => setIsMegaMenuOpen(false)}
                        className="flex items-center gap-2.5 p-1.5 rounded-[4px] hover:bg-[#F7F7F7] group transition-colors"
                      >
                        <div className="w-8 h-8 rounded-[4px] bg-[#F2F2F2] border border-[#EAEAEA] overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium normal-case text-[#0A0A0A] group-hover:text-pop transition-colors truncate">
                            {cat.name}
                          </div>
                          <div className="text-[10px] normal-case text-[#8A8A8A]">
                            {cat.itemCount} items
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Mega Menu Featured Capsule */}
                  <div className="col-span-1 bg-[#F7F7F7] p-4 rounded-[4px] border border-[#EAEAEA] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-pop font-semibold mb-1.5">
                        <Sparkles size={11} /> Curated Capsule
                      </div>
                      <h4 className="text-xs font-semibold normal-case text-[#0A0A0A] mb-1">
                        Motorsport & Impact Armor
                      </h4>
                      <p className="text-[11px] normal-case text-[#6B6B6B] leading-relaxed mb-3">
                        Discover F1 paddock graphics and military drop-tested phone cases.
                      </p>
                    </div>
                    <Link 
                      to="/shop?category=phone-cases"
                      onClick={() => setIsMegaMenuOpen(false)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A0A0A] hover:text-pop transition-colors group"
                    >
                      Explore Cases <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Visible Links */}
            {visibleLinks.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.id}
                  to={link.to}
                  className={`hover:text-pop transition-colors py-2 flex items-center gap-1 ${
                    link.isFlash ? 'text-pop font-bold' : ''
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Priority+ Overflow "More" Dropdown */}
            {overflowLinks.length > 0 && (
              <div 
                ref={moreMenuRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(prev => !prev)}
                  className="flex items-center gap-1 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors py-2"
                  title="More Navigation Links"
                  aria-label="More navigation links"
                >
                  <MoreHorizontal size={14} />
                  <span>More</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-[#EAEAEA] shadow-xl rounded-[4px] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-[#F0F0F0]">
                    {overflowLinks.map(link => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.id}
                          to={link.to}
                          onClick={() => setIsMoreMenuOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase hover:bg-[#F7F7F7] transition-colors ${
                            link.isFlash ? 'text-pop' : 'text-[#0A0A0A]'
                          }`}
                        >
                          {Icon && <Icon size={13} />}
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* ======================================================== */}
          {/* 3. CENTER-RIGHT: EXPANDED INLINE SEARCH (Part 3)         */}
          {/* ======================================================== */}
          <div className="flex-1 flex justify-end md:justify-center">
            <NavbarSearch
              isMobileModalOpen={isMobileSearchOpen}
              onCloseMobileModal={() => setIsMobileSearchOpen(false)}
            />
          </div>

          {/* ======================================================== */}
          {/* 4. FAR RIGHT: FIXED-PRIORITY ACTIONS (ALWAYS VISIBLE)    */}
          {/* ======================================================== */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 select-none">
            
            {/* Mobile Search Icon Trigger (< 768px) */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden p-2 text-[#0A0A0A] hover:text-pop transition-colors"
              aria-label="Search Catalog"
            >
              <Search size={20} strokeWidth={1.75} />
            </button>

            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              className="p-2 text-[#0A0A0A] hover:text-pop transition-colors relative"
              aria-label="Wishlist"
              title="My Wishlist"
            >
              <Heart size={20} strokeWidth={1.75} />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#0A0A0A] text-white text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* User Account / Sign In */}
            <NavbarAccountMenu
              accountRef={accountRef}
              isAuthenticated={isAuthenticated}
              user={user}
              isAccountDropdownOpen={isAccountDropdownOpen}
              setIsAccountDropdownOpen={setIsAccountDropdownOpen}
              logout={logout}
              openAuthModal={openAuthModal}
            />

            {/* Shopping Cart Button (Bag / B2B Bag) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className={`px-2 py-1.5 text-[#0A0A0A] hover:text-pop transition-all relative flex items-center gap-1.5 ${
                  cartBump ? 'animate-cart-bump' : ''
                }`}
                aria-label={`Open ${mode === 'wholesale' ? 'Wholesale' : 'Retail'} Shopping Bag`}
                title={`${mode === 'wholesale' ? 'Wholesale' : 'Retail'} bag: ${cartCount} items | Other bag: ${otherCartCount} items`}
              >
                {/* Wholesale Mode "W" Marker (Separate tiny pill left of icon) */}
                {mode === 'wholesale' && (
                  <span 
                    className="text-[9px] font-mono font-bold bg-[#0A0A0A] text-pop px-1 py-0.2 rounded-[2px] border border-pop/40 shrink-0"
                    title="Wholesale Procurement Cart Active"
                  >
                    W
                  </span>
                )}

                {/* Shopping Bag Icon with Pinned Top-Right Count Badge */}
                <div className="relative shrink-0">
                  <ShoppingBag size={20} strokeWidth={1.75} />
                  {cartCount > 0 && (
                    <span 
                      className="absolute -top-1.5 -right-2 bg-pop text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center tabular-nums shadow-sm select-none"
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </div>

                {/* Label: Never wraps, never overlaps badge */}
                <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] whitespace-nowrap">
                  {mode === 'wholesale' ? 'B2B Bag' : 'Bag'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MOBILE DRAWER OVERLAY (< 1024px)                      */}
      {/* ======================================================== */}
      <NavbarMobileDrawer
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        branding={branding}
        mode={mode}
        switchMode={switchMode}
        user={user}
        isAuthenticated={isAuthenticated}
        logout={logout}
        openAuthModal={openAuthModal}
      />
    </header>
  );
}
