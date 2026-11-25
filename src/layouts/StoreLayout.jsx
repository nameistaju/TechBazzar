// src/layouts/StoreLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import AnnouncementBar from '../components/common/AnnouncementBar';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import CartDrawer from '../components/common/CartDrawer';
import WholesaleAccessSheet from '../components/wholesale/WholesaleAccessSheet';
import { useStore } from '../context/StoreContext';
import useAuthStore from '../store/authStore';
import { useBranding } from '../context/BrandingContext';

export default function StoreLayout() {
  const { isWholesaleSheetOpen, closeWholesaleSheet, wholesaleSheetTab } = useStore();
  const { user } = useAuthStore();
  const { branding } = useBranding();
  const location = useLocation();

  const [showAdminMiniBar, setShowAdminMiniBar] = useState(false);

  // Dynamic Document Title
  useEffect(() => {
    const brand = branding.brand_name || 'TechBazaar';
    const path = location.pathname;
    let pageTitle = '';
    if (path === '/') pageTitle = `${brand} — ${branding.tagline || 'Curated Electronics & Modern Gadgets'}`;
    else if (path.startsWith('/shop')) pageTitle = `Catalog & Devices | ${brand}`;
    else if (path.startsWith('/quick-order')) pageTitle = `Quick Order Matrix | ${brand}`;
    else if (path.startsWith('/quote')) pageTitle = `Wholesale RFQ Quote | ${brand}`;
    else if (path.startsWith('/cart')) pageTitle = `Shopping Bag | ${brand}`;
    else if (path.startsWith('/track')) pageTitle = `Order Tracking | ${brand}`;
    else if (path.startsWith('/account')) pageTitle = `My Account | ${brand}`;
    else pageTitle = `${brand}`;

    document.title = pageTitle;
  }, [location.pathname, branding]);

  useEffect(() => {
    // Check if opened from admin via URL param or sessionStorage
    const searchParams = new URLSearchParams(location.search);
    const fromAdminParam = searchParams.get('fromAdmin');
    const storedFromAdmin = sessionStorage.getItem('techbazaar_from_admin');

    if (fromAdminParam === 'true') {
      sessionStorage.setItem('techbazaar_from_admin', 'true');
      setShowAdminMiniBar(true);
    } else if (storedFromAdmin === 'true' && user?.role === 'admin') {
      setShowAdminMiniBar(true);
    }
  }, [location.search, user]);

  const handleDismissMiniBar = () => {
    setShowAdminMiniBar(false);
    sessionStorage.removeItem('techbazaar_from_admin');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-clip">
      {/* 32px Dismissible "Back to Admin" Mini Bar */}
      {showAdminMiniBar && user?.role === 'admin' && (
        <aside
          aria-label="Admin live store bar"
          className="h-8 bg-[#0A0A0A] text-white flex items-center justify-between px-4 sm:px-6 text-[11px] font-mono border-b border-[#222222] z-50 sticky top-0"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[#A1A1AA] hidden sm:inline">Viewing Live Storefront</span>
            <span className="text-[#71717A] hidden sm:inline">•</span>
            <span className="text-white font-medium truncate">Logged in as {user.name} (Admin)</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            <Link
              to="/admin"
              className="text-pop hover:underline flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider"
            >
              <span>Back to Admin</span>
              <ArrowRight size={12} />
            </Link>
            <button
              type="button"
              onClick={handleDismissMiniBar}
              className="text-[#71717A] hover:text-white p-0.5 transition-colors"
              title="Dismiss banner"
              aria-label="Dismiss banner"
            >
              <X size={13} />
            </button>
          </div>
        </aside>
      )}

      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      <Footer />
      <CartDrawer />
      <WholesaleAccessSheet
        isOpen={isWholesaleSheetOpen}
        onClose={closeWholesaleSheet}
        initialTab={wholesaleSheetTab}
      />
    </div>
  );
}
