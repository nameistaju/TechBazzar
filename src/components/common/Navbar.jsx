import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Heart, 
  ShoppingBag, 
  User, 
  Menu, 
  X, 
  ChevronDown, 
  ArrowRight,
  Sparkles,
  Zap,
  PackageCheck,
  ShieldAlert,
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import useAuthStore from '../../store/authStore';
import { categories } from '../../data/categories';
import { products } from '../../data/products';

export default function Navbar() {
  const { cartCount, wishlistCount, setIsCartOpen, cartBump } = useStore();
  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('techbazaar_recent_searches');
      return saved ? JSON.parse(saved) : ['AirPods', 'Power Bank', 'F1 Phone Case', 'Noise Watch'];
    } catch {
      return ['AirPods', 'Power Bank', 'F1 Phone Case'];
    }
  });
  
  const searchRef = useRef(null);
  const megaMenuRef = useRef(null);
  const accountRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMegaMenuOpen(false);
    setIsSearchFocused(false);
    setIsAccountDropdownOpen(false);
  }, [location.pathname]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target)) {
        setIsMegaMenuOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter live search suggestions
  const searchResults = searchQuery.trim().length > 1 
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 6)
    : [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Save to recent searches
    const q = searchQuery.trim();
    const updated = [q, ...recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('techbazaar_recent_searches', JSON.stringify(updated));
    } catch {}

    setIsSearchFocused(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleRecentClick = (term) => {
    setSearchQuery(term);
    setIsSearchFocused(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className={`sticky top-0 z-40 bg-white transition-all duration-200 ${
      isScrolled ? 'border-b border-[#EAEAEA] shadow-[0_2px_12px_rgba(0,0,0,0.03)]' : 'border-b border-[#F0F0F0]'
    }`}>
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20 gap-4">
          
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1.5 text-[#0A0A0A] hover:text-[#FF4D00] transition-colors"
              aria-label="Open mobile navigation menu"
            >
              <Menu size={22} strokeWidth={1.75} />
            </button>
          </div>

          {/* Brand Logo - 3D Shopping Bag + Orbit Logo & Electova typography */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <img 
              src="/logo.png" 
              alt="TechBazaar Logo" 
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-105 transition-transform drop-shadow-[0_2px_6px_rgba(255,77,0,0.2)]" 
            />
            <div className="flex items-center gap-1">
              <span className="font-light tracking-[0.22em] text-lg sm:text-xl uppercase text-[#0A0A0A] group-hover:text-[#FF4D00] transition-colors">
                TECH<strong className="font-bold">BAZAAR</strong>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] inline-block -mt-1" />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
            <Link to="/shop" className="hover:text-[#FF4D00] transition-colors py-2">
              All Products
            </Link>

            {/* Categories Mega Menu Trigger */}
            <div 
              ref={megaMenuRef}
              className="relative"
              onMouseEnter={() => setIsMegaMenuOpen(true)}
              onMouseLeave={() => setIsMegaMenuOpen(false)}
            >
              <button 
                type="button"
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className="flex items-center gap-1 hover:text-[#FF4D00] transition-colors py-2"
              >
                Categories
                <ChevronDown size={14} className={`transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega Menu Dropdown */}
              {isMegaMenuOpen && (
                <div className="absolute top-full -left-20 w-[720px] lg:w-[860px] bg-white border border-[#EAEAEA] shadow-[0_16px_36px_rgba(0,0,0,0.08)] p-6 z-50 rounded-[4px] grid grid-cols-3 gap-6 animate-fadeIn">
                  <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-3">
                    {categories.slice(0, 10).map((cat) => (
                      <Link 
                        key={cat.id} 
                        to={`/shop?category=${cat.id}`}
                        onClick={() => setIsMegaMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-[4px] hover:bg-[#F7F7F7] group transition-colors"
                      >
                        <div className="w-9 h-9 rounded-[4px] bg-[#F2F2F2] border border-[#EAEAEA] overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                          <div className="text-xs font-medium normal-case text-[#0A0A0A] group-hover:text-[#FF4D00] transition-colors">
                            {cat.name}
                          </div>
                          <div className="text-[10px] normal-case text-[#8A8A8A]">
                            {cat.itemCount} items
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Mega Menu Featured Card */}
                  <div className="col-span-1 bg-[#F7F7F7] p-5 rounded-[4px] border border-[#EAEAEA] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#FF4D00] font-semibold mb-2">
                        <Sparkles size={12} /> Curated Capsule
                      </div>
                      <h4 className="text-sm font-semibold normal-case text-[#0A0A0A] mb-1">
                        Motorsport & Impact Armor
                      </h4>
                      <p className="text-xs normal-case text-[#6B6B6B] leading-relaxed mb-4">
                        Discover F1 paddock graphics, Mughal frescoes, and military drop-tested phone cases.
                      </p>
                    </div>
                    <Link 
                      to="/shop?category=phone-cases"
                      onClick={() => setIsMegaMenuOpen(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A0A0A] hover:text-[#FF4D00] transition-colors group"
                    >
                      Explore Phone Cases <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link to="/shop?flag=flashSale" className="flex items-center gap-1 text-[#FF4D00] hover:text-[#E04400] transition-colors py-2">
              <Zap size={13} /> Flash Sale
            </Link>

            <Link to="/track" className="flex items-center gap-1 hover:text-[#FF4D00] transition-colors py-2">
              <PackageCheck size={13} /> Track Order
            </Link>

            {user?.role === 'admin' && (
              <Link to="/admin" className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 transition-colors py-2 font-bold">
                <LayoutDashboard size={13} /> Admin
              </Link>
            )}
          </nav>

          {/* Live Search Bar (Debounced with Highlighted Matches & Recents) */}
          <div ref={searchRef} className="relative flex-1 max-w-xs lg:max-w-sm hidden sm:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search audio, cases, watches, power..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full bg-[#F7F7F7] border border-[#EAEAEA] focus:border-[#0A0A0A] focus:bg-white text-xs text-[#0A0A0A] placeholder-[#8A8A8A] pl-9 pr-4 py-2.5 rounded-[4px] transition-all outline-none"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
            </form>

            {/* Live Autocomplete Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EAEAEA] shadow-[0_12px_32px_rgba(0,0,0,0.08)] rounded-[4px] p-2 z-50 animate-fadeIn">
                {searchQuery.trim().length > 1 ? (
                  searchResults.length > 0 ? (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold border-b border-[#F0F0F0] flex justify-between">
                        <span>Matching Catalog</span>
                        <span>{searchResults.length} results</span>
                      </div>
                      {searchResults.map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          onClick={() => setIsSearchFocused(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-[#F7F7F7] rounded-[4px] transition-colors group"
                        >
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-9 h-9 object-contain bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-0.5" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-[#0A0A0A] group-hover:text-[#FF4D00] truncate transition-colors">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-[#6B6B6B] flex items-center gap-2">
                              <span>{product.brand}</span>
                              <span>•</span>
                              <span className="font-semibold text-[#0A0A0A] tabular-nums">₹{product.price.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="w-full text-center py-2 text-xs text-[#FF4D00] font-medium hover:bg-[#FFF0EB] rounded-[4px] mt-1 transition-colors flex items-center justify-center gap-1"
                      >
                        View all results for "{searchQuery}" <ArrowRight size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-[#6B6B6B]">
                      No gadgets found matching "{searchQuery}"
                    </div>
                  )
                ) : (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold border-b border-[#F0F0F0]">
                      Popular & Recent Searches
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-2.5">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleRecentClick(term)}
                          className="px-2.5 py-1 bg-[#F7F7F7] hover:bg-[#EAEAEA] text-[11px] text-[#0A0A0A] rounded-[2px] transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons: Track Order, Wishlist, Account, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              className="p-2 text-[#0A0A0A] hover:text-[#FF4D00] transition-colors relative"
              aria-label="Wishlist"
            >
              <Heart size={20} strokeWidth={1.75} />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#0A0A0A] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Account / Sign In Trigger */}
            <div ref={accountRef} className="relative">
              {isAuthenticated ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                    className="flex items-center gap-1.5 p-1.5 text-[#0A0A0A] hover:text-[#FF4D00] transition-colors text-xs font-semibold uppercase tracking-wider"
                    aria-label="User Account Menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-[11px] font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown size={13} className={`hidden lg:block transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {isAccountDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#EAEAEA] shadow-lg rounded-[4px] py-1.5 z-50 animate-fadeIn">
                      <div className="px-3 py-2 border-b border-[#F0F0F0]">
                        <p className="text-xs font-semibold text-[#0A0A0A] truncate">{user.name}</p>
                        <p className="text-[10px] text-[#8A8A8A] truncate">{user.email}</p>
                      </div>
                      
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
                        >
                          <LayoutDashboard size={14} /> Admin Dashboard
                        </Link>
                      )}

                      <Link
                        to="/account"
                        onClick={() => setIsAccountDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-[#0A0A0A] hover:bg-[#F7F7F7] transition-colors"
                      >
                        <User size={14} /> My Account
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
                  className="p-2 text-[#0A0A0A] hover:text-[#FF4D00] transition-colors flex items-center gap-1.5"
                  aria-label="Sign in"
                >
                  <User size={20} strokeWidth={1.75} />
                  <span className="hidden xl:inline text-xs font-semibold uppercase tracking-wider">
                    Sign In
                  </span>
                </button>
              )}
            </div>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className={`p-2 text-[#0A0A0A] hover:text-[#FF4D00] transition-all relative flex items-center gap-2 ${
                cartBump ? 'animate-cart-bump' : ''
              }`}
              aria-label="Open Shopping Cart"
            >
              <div className="relative">
                <ShoppingBag size={20} strokeWidth={1.75} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#FF4D00] text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center tabular-nums shadow-sm">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden xl:inline text-xs font-semibold uppercase tracking-wider">
                Bag
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-fadeIn">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#EAEAEA]">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="TechBazaar" className="w-7 h-7 object-contain drop-shadow-sm" />
                  <span className="font-light tracking-[0.2em] text-lg uppercase text-[#0A0A0A]">
                    TECH<strong className="font-semibold">BAZAAR</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Search input */}
              <form onSubmit={handleSearchSubmit} className="mt-4 mb-6 relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F7F7F7] border border-[#EAEAEA] text-xs text-[#0A0A0A] pl-9 pr-4 py-2.5 rounded-[4px] outline-none"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
              </form>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col gap-4 text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
                <Link to="/shop" className="hover:text-[#FF4D00] py-1">
                  All Products
                </Link>
                <Link to="/shop?flag=flashSale" className="text-[#FF4D00] py-1 flex items-center gap-1.5">
                  <Zap size={14} /> Flash Sale
                </Link>
                <Link to="/track" className="hover:text-[#FF4D00] py-1 flex items-center gap-1.5">
                  <PackageCheck size={14} /> Track Order
                </Link>

                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-emerald-700 py-1 flex items-center gap-1.5">
                    <LayoutDashboard size={14} /> Admin Dashboard
                  </Link>
                )}

                <div className="pt-4 border-t border-[#EAEAEA]">
                  <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider block mb-2">
                    Departments
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {categories.slice(0, 8).map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/shop?category=${cat.id}`}
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
            <div className="pt-6 border-t border-[#EAEAEA]">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <Link
                    to="/account"
                    className="w-full py-2.5 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] flex items-center justify-center gap-2"
                  >
                    <User size={14} /> My Account
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full py-2 text-xs text-red-600 font-medium text-center"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsMobileMenuOpen(false); openAuthModal('login'); }}
                  className="w-full py-2.5 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] flex items-center justify-center gap-2"
                >
                  <User size={14} /> Sign In / Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
