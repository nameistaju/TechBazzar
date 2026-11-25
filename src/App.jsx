import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowUp } from 'lucide-react';

import { StoreProvider } from './context/StoreContext';
import { BrandingProvider } from './context/BrandingContext';
import useAuthStore from './store/authStore';

import StoreLayout from './layouts/StoreLayout';
import Toast from './components/common/Toast';
import AuthModal from './components/auth/AuthModal';
import HomePage from './pages/HomePage';

const ShopPage = lazy(() => import('./pages/ShopPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const WholesaleCheckoutPage = lazy(() => import('./pages/WholesaleCheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const QuickOrderPage = lazy(() => import('./pages/QuickOrderPage'));
const QuoteRequestPage = lazy(() => import('./pages/QuoteRequestPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      <div className="h-6 w-48 bg-[#F0F0F0] rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-64 bg-[#F5F5F5] rounded" />
        <div className="h-64 bg-[#F5F5F5] rounded" />
        <div className="h-64 bg-[#F5F5F5] rounded" />
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false
    }
  }
});

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Back to top floating button
function BackToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      setShow(window.scrollY > 400);
    };
    window.addEventListener('scroll', checkScroll);
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 left-6 z-40 bg-[#0A0A0A] text-white p-3 rounded-[4px] shadow-lg border border-[#222222] hover:bg-[#FF4D00] transition-colors cursor-pointer"
      aria-label="Back to top of page"
    >
      <ArrowUp size={16} />
    </button>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Admin Back-Office Routes: Isolated under AdminLayout */}
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* Storefront Routes: Wrapped inside StoreLayout */}
          <Route element={<StoreLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/wholesale-checkout" element={<WholesaleCheckoutPage />} />
            <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
            <Route path="/track" element={<TrackOrderPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/quick-order" element={<QuickOrderPage />} />
            <Route path="/quote" element={<QuoteRequestPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>

      <Toast />
      <AuthModal />
      <BackToTopButton />
    </BrowserRouter>
  );
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}
