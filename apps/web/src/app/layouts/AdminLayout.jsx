// src/layouts/AdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Search, 
  Plus, 
  Bell, 
  ExternalLink, 
  LogOut, 
  ChevronDown, 
  AlertTriangle,
  Package,
  FileSpreadsheet,
  Receipt,
  ShoppingBag,
  Settings
} from 'lucide-react';
import { useBranding } from '@app/providers/BrandingContext';

export default function AdminLayout({
  navItems = [],
  activeTab = 'dashboard',
  onTabChange,
  user,
  onOpenSearch,
  onLogout,
  notificationItems = [],
  children
}) {
  const { branding } = useBranding();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Responsive breakpoint tracking
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (width < 768) {
        setIsSidebarOpen(false);
      } else if (width < 1100) {
        setIsSidebarOpen(false); // Collapsed to icons between 768 and 1100
      } else {
        setIsSidebarOpen(true); // Full sidebar >= 1100
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.admin-topbar-dropdown')) {
        setIsQuickCreateOpen(false);
        setIsNotificationsOpen(false);
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSidebar = () => {
    if (windowWidth < 768) {
      setIsMobileDrawerOpen(prev => !prev);
    } else {
      setIsSidebarOpen(prev => !prev);
    }
  };

  const handleLiveStoreClick = () => {
    sessionStorage.setItem('techbazaar_from_admin', 'true');
  };

  return (
    <div className="h-screen w-screen bg-[#F7F7F7] text-[#0A0A0A] flex flex-col font-sans overflow-hidden">
      {/* ======================================================== */}
      {/* 1. FIXED TOP BAR (h-14, 56px)                            */}
      {/* ======================================================== */}
      <header className="h-14 bg-white border-b border-[#EAEAEA] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-40 select-none overflow-hidden">
        {/* Left: Hamburger & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="p-1.5 -ml-1 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded transition-colors"
            title="Toggle Sidebar Navigation"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/admin" className="flex items-center gap-2 group shrink-0">
            <img 
              src={branding.logo_mark || '/favicon.png'} 
              alt={branding.brand_name || 'TechBazaar'} 
              className="h-7 w-auto object-contain shrink-0" 
            />
            <span className="font-mono text-xs tracking-wider uppercase font-bold text-[#0A0A0A] hidden sm:inline whitespace-nowrap">
              {branding.brand_name?.toUpperCase() || 'TECHBAZAAR'} <span className="text-pop font-normal hidden lg:inline">BACK-OFFICE</span>
            </span>
          </Link>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 min-w-0 max-w-md mx-2 lg:mx-4 hidden md:block">
          <div
            onClick={onOpenSearch}
            className="flex items-center justify-between px-3 py-1.5 bg-[#F7F7F7] border border-[#EAEAEA] hover:border-[#0A0A0A] cursor-pointer text-xs font-mono text-[#6B6B6B] transition-colors rounded-[2px]"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#999999]" />
              <span className="truncate">Search products, orders, invoices, clients...</span>
            </div>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#DDDDDD] text-[10px] text-[#333333] rounded-[2px] shrink-0">
              /
            </kbd>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* View Live Storefront */}
          <Link
            to="/?fromAdmin=true"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLiveStoreClick}
            className="hidden sm:flex items-center gap-1 text-xs font-mono uppercase text-[#6B6B6B] hover:text-[#FF4D00] transition-colors px-2 py-1 rounded-[2px] whitespace-nowrap"
            title="Open Live Store in new tab (with return bar)"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          {/* Quick Create Dropdown */}
          <div className="relative admin-topbar-dropdown">
            <button
              type="button"
              onClick={() => {
                setIsQuickCreateOpen(prev => !prev);
                setIsNotificationsOpen(false);
                setIsAccountMenuOpen(false);
              }}
              className="px-2.5 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1 transition-colors font-semibold rounded-[2px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create</span>
              <kbd className="hidden lg:inline text-[9px] opacity-75 font-normal ml-0.5">N</kbd>
            </button>

            {isQuickCreateOpen && (
              <div className="absolute right-0 top-10 w-52 bg-white border border-[#0A0A0A] shadow-xl z-50 py-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => { onTabChange('products'); setIsQuickCreateOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <Package className="w-3.5 h-3.5 text-[#FF4D00]" />
                  <span>New Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onTabChange('estimates'); setIsQuickCreateOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#FF4D00]" />
                  <span>New Estimate</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onTabChange('invoices'); setIsQuickCreateOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#FF4D00]" />
                  <span>New Tax Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onTabChange('orders'); setIsQuickCreateOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2 border-t border-[#F0F0F0]"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FF4D00]" />
                  <span>Manual Walk-in Order</span>
                </button>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative admin-topbar-dropdown">
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(prev => !prev);
                setIsQuickCreateOpen(false);
                setIsAccountMenuOpen(false);
              }}
              className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] relative hover:bg-[#F7F7F7] rounded transition-colors"
              title="System Alerts"
            >
              <Bell className="w-4 h-4" />
              {notificationItems.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#FF4D00] absolute top-1 right-1" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-10 w-72 sm:w-80 bg-white border border-[#0A0A0A] shadow-xl z-50 p-3 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="font-mono uppercase text-[10px] font-bold text-[#6B6B6B] mb-2 pb-1 border-b border-[#EAEAEA] flex items-center justify-between">
                  <span>Operational Notifications</span>
                  <span className="text-pop">{notificationItems.length} alerts</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notificationItems.length > 0 ? (
                    notificationItems.map((n, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          onTabChange(n.tab);
                          setIsNotificationsOpen(false);
                        }}
                        className="p-2 border border-[#EAEAEA] hover:border-[#0A0A0A] cursor-pointer text-xs rounded-[2px]"
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-[#0A0A0A]">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#FF4D00]" />
                          <span>{n.type === 'low_stock' ? 'Low Stock Warning' : 'Pending Fulfillment'}</span>
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] mt-0.5">{n.text}</div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-[#999999] text-xs">
                      All systems operating smoothly. No urgent alerts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account Dropdown */}
          <div className="relative admin-topbar-dropdown">
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(prev => !prev);
                setIsQuickCreateOpen(false);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 pl-2 border-l border-[#EAEAEA] text-left hover:opacity-90"
            >
              <div className="w-7 h-7 bg-[#0A0A0A] text-white text-xs font-mono font-bold flex items-center justify-center rounded-full shrink-0">
                TB
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-semibold leading-tight text-[#0A0A0A] truncate max-w-[120px]">
                  {user?.name || 'Administrator'}
                </div>
                <div className="text-[10px] font-mono text-[#6B6B6B]">Single Owner</div>
              </div>
              <ChevronDown className="w-3 h-3 text-[#6B6B6B]" />
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 top-10 w-52 bg-white border border-[#0A0A0A] shadow-xl z-50 py-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3 border-b border-[#EAEAEA]">
                  <div className="font-bold text-[#0A0A0A] truncate">{user?.name}</div>
                  <div className="text-[10px] text-[#6B6B6B] truncate">{user?.email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onTabChange('settings');
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Account & Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-[#EAEAEA]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. BODY CONTAINER: SIDEBAR + MAIN CONTENT                */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Drawer (screens < 768px) */}
        {windowWidth < 768 && isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
            {/* Off-canvas Sidebar */}
            <aside className="relative w-64 bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
              <div className="h-14 px-4 border-b border-[#EAEAEA] flex items-center justify-between shrink-0">
                <span className="font-mono text-xs uppercase font-bold tracking-wider">Navigation</span>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 py-3 space-y-0.5 overflow-y-auto">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onTabChange(item.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                        isActive
                          ? 'bg-[#0A0A0A] text-white font-bold'
                          : 'text-[#6B6B6B] hover:bg-[#F7F7F7] hover:text-[#0A0A0A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF4D00]' : 'text-[#6B6B6B]'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className={`px-1.5 py-0.2 text-[10px] text-white font-bold rounded-full ${item.badgeColor || 'bg-black'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* Desktop / Tablet Sidebar (screens >= 768px) */}
        {windowWidth >= 768 && (
          <aside className={`${
            isSidebarOpen ? 'w-56' : 'w-16'
          } bg-white border-r border-[#EAEAEA] flex flex-col shrink-0 transition-all duration-150 select-none overflow-y-auto`}>
            <div className="flex-1 py-3 space-y-0.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    title={!isSidebarOpen ? item.label : undefined}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors relative ${
                      isActive
                        ? 'bg-[#0A0A0A] text-white font-bold'
                        : 'text-[#6B6B6B] hover:bg-[#F7F7F7] hover:text-[#0A0A0A]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF4D00]' : 'text-[#6B6B6B]'}`} />
                      {isSidebarOpen && <span className="truncate">{item.label}</span>}
                    </div>

                    {isSidebarOpen && item.badge > 0 && (
                      <span className={`px-1.5 py-0.2 text-[10px] text-white font-bold rounded-full shrink-0 ${item.badgeColor || 'bg-black'}`}>
                        {item.badge}
                      </span>
                    )}

                    {!isSidebarOpen && item.badge > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#FF4D00] absolute top-2 right-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Footer info */}
            {isSidebarOpen && (
              <div className="p-4 border-t border-[#EAEAEA] text-[10px] font-mono text-[#999999] leading-tight shrink-0">
                <div>TechBazaar Single-Owner</div>
                <div>v2.0 • Bengaluru</div>
              </div>
            )}
          </aside>
        )}

        {/* Main Workspace Area: Independent Scrolling, Zero Double Scrollbar */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
