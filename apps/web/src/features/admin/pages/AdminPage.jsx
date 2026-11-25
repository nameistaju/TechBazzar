// src/pages/AdminPage.jsx
// TechBazaar Single-Owner Complete Business Back-Office

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Boxes,
  ShoppingBag, 
  FileSpreadsheet,
  Receipt,
  Users, 
  Tag,
  BarChart3,
  Settings,
  History,
  ShieldCheck,
  Layers,
  MessageSquare
} from 'lucide-react';
import useAuthStore from '@shared/store/authStore';
import adminApi from '@shared/api/adminApi';
import useToastStore from '@shared/store/toastStore';
import AdminLayout from '@app/layouts/AdminLayout';

// Admin Sub-Views
import DashboardView from '@features/admin/components/DashboardView';
import ProductsView from '@features/admin/components/products/ProductsView';
import InventoryView from '@features/admin/components/inventory/InventoryView';
import OrdersView from '@features/admin/components/orders/OrdersView';
import EstimatesView from '@features/admin/components/estimates/EstimatesView';
import InvoicesView from '@features/admin/components/invoices/InvoicesView';
import CustomersView from '@features/admin/components/customers/CustomersView';
import DiscountsView from '@features/admin/components/discounts/DiscountsView';
import ReportsView from '@features/admin/components/ReportsView';
import SettingsView from '@features/admin/components/SettingsView';
import ActivityLogView from '@features/admin/components/ActivityLogView';
import BannersView from '@features/admin/components/banners/BannersView';
import QuotesView from '@features/admin/components/QuotesView';

// Modals
import { 
  ForcePasswordChangeModal, 
  SessionTimeoutModal, 
  GlobalSearchModal 
} from '@features/admin/components/AdminModals';

export default function AdminPage() {
  const { user, isAuthenticated, isLoading, openAuthModal, logout, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  // Active Module Tab
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Navigation Deep-link Parameters
  const [targetProductId, setTargetProductId] = useState(null);
  const [targetOrderId, setTargetOrderId] = useState(null);
  const [targetCustomerId, setTargetCustomerId] = useState(null);
  const [preselectedRestockProduct, setPreselectedRestockProduct] = useState(null);

  // Global UI State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSessionTimeoutOpen, setIsSessionTimeoutOpen] = useState(false);

  // Live Notification Badge Counts
  const [badges, setBadges] = useState({ lowStock: 0, pendingOrders: 0, unpaidInvoices: 0 });
  const [notificationItems, setNotificationItems] = useState([]);

  // Fetch Notification Badges
  const fetchBadges = async () => {
    try {
      const res = await adminApi.getStats('today');
      if (res.data) {
        setBadges({
          lowStock: res.data.lowStockCount || 0,
          pendingOrders: res.data.pendingOrders || 0,
          unpaidInvoices: res.data.unpaidInvoicesCount || 0
        });

        const items = [];
        if (res.data.lowStockCount > 0) {
          items.push({
            type: 'low_stock',
            text: `${res.data.lowStockCount} items have reached low stock threshold`,
            tab: 'inventory'
          });
        }
        if (res.data.pendingOrders > 0) {
          items.push({
            type: 'order',
            text: `${res.data.pendingOrders} new order(s) waiting for dispatch`,
            tab: 'orders'
          });
        }
        setNotificationItems(items);
      }
    } catch (err) {
      if (err.status === 401) {
        setIsSessionTimeoutOpen(true);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchBadges();
      const interval = setInterval(fetchBadges, 60000); // 1-minute background refresh
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Auth Protection Check
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== 'admin') {
        openAuthModal('login');
      }
    }
  }, [isLoading, isAuthenticated, user, openAuthModal]);

  // Keyboard Shortcuts Handler (/ for search, N for quick create, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          setIsSearchOpen(false);
          setIsQuickCreateOpen(false);
          setIsNotificationsOpen(false);
          setIsAccountMenuOpen(false);
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsQuickCreateOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsQuickCreateOpen(false);
        setIsNotificationsOpen(false);
        setIsAccountMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick navigation handler from search or subcomponents
  const handleDirectNavigate = (tab, targetId = null) => {
    setActiveTab(tab);
    if (tab === 'products' && targetId) setTargetProductId(targetId);
    if (tab === 'orders' && targetId) setTargetOrderId(targetId);
    if (tab === 'customers' && targetId) setTargetCustomerId(targetId);
  };

  // Nav Items definition (13 Modules)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: badges.lowStock, badgeColor: 'bg-[#FF4D00]' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: badges.pendingOrders, badgeColor: 'bg-[#0A0A0A]' },
    { id: 'quotes', label: 'RFQ Inquiries', icon: MessageSquare },
    { id: 'estimates', label: 'Estimates', icon: FileSpreadsheet },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'banners', label: 'Banners & Ads', icon: Layers },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'discounts', label: 'Discounts', icon: Tag },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'activity_log', label: 'Activity Log', icon: History }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center font-mono text-xs text-[#6B6B6B]">
        Initializing TechBazaar Back-Office Session...
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-[#0A0A0A] text-white flex items-center justify-center rounded-full mb-4">
          <ShieldCheck className="w-6 h-6 text-[#FF4D00]" />
        </div>
        <h2 className="text-xl font-bold font-mono uppercase text-[#0A0A0A]">
          Single Owner Back-Office Access
        </h2>
        <p className="text-xs text-[#6B6B6B] max-w-sm mt-1 mb-6">
          Administrator credentials required. Please sign in with the owner account (admin@techbazaar.com).
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 bg-[#0A0A0A] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#FF4D00] transition-colors font-bold"
        >
          Sign In as Admin
        </button>
      </div>
    );
  }

  return (
    <>
      <AdminLayout
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={handleDirectNavigate}
        user={user}
        onOpenSearch={() => setIsSearchOpen(true)}
        onLogout={logout}
        notificationItems={notificationItems}
      >
            {/* 1. Dashboard View */}
            {activeTab === 'dashboard' && (
              <DashboardView
                onNavigate={handleDirectNavigate}
                onQuickRestock={(product) => {
                  setPreselectedRestockProduct(product);
                  setActiveTab('inventory');
                }}
              />
            )}

            {/* 2. Products Catalog View */}
            {activeTab === 'products' && (
              <ProductsView
                initialEditId={targetProductId}
                onClearInitialEdit={() => setTargetProductId(null)}
              />
            )}

            {/* 3. Inventory View */}
            {activeTab === 'inventory' && (
              <InventoryView
                preselectedProduct={preselectedRestockProduct}
                onClearPreselected={() => setPreselectedRestockProduct(null)}
              />
            )}

            {/* 4. Orders View */}
            {activeTab === 'orders' && (
              <OrdersView
                initialOrderId={targetOrderId}
                onClearInitialOrder={() => setTargetOrderId(null)}
                onNavigate={handleDirectNavigate}
              />
            )}

            {/* 5. Quotes View */}
            {activeTab === 'quotes' && (
              <QuotesView onNavigate={handleDirectNavigate} />
            )}

            {/* 6. Estimates View */}
            {activeTab === 'estimates' && (
              <EstimatesView onNavigate={handleDirectNavigate} />
            )}

            {/* 7. Invoices View */}
            {activeTab === 'invoices' && (
              <InvoicesView />
            )}

            {/* 8. Banners & Ads View */}
            {activeTab === 'banners' && (
              <BannersView />
            )}

            {/* 7. Customers CRM View */}
            {activeTab === 'customers' && (
              <CustomersView
                initialCustomerId={targetCustomerId}
                onClearInitialCustomer={() => setTargetCustomerId(null)}
                onNavigate={handleDirectNavigate}
              />
            )}

            {/* 8. Discounts View */}
            {activeTab === 'discounts' && (
              <DiscountsView />
            )}

            {/* 9. Reports View */}
            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {/* 10. Settings View */}
            {activeTab === 'settings' && (
              <SettingsView />
            )}

            {/* 11. Activity Log View */}
            {activeTab === 'activity_log' && (
              <ActivityLogView />
            )}
      </AdminLayout>

      {/* ======================================================== */}
      {/* 3. GLOBAL MODALS */}
      {/* ======================================================== */}

      {/* Force Password Change on First Login */}
      <ForcePasswordChangeModal
        isOpen={Boolean(user?.mustChangePassword)}
        onClose={() => {}}
        onPasswordChanged={() => {
          checkAuth();
          addToast({ type: 'success', message: 'Password updated. Welcome to your back-office!' });
        }}
      />

      {/* Session Timeout Re-Authentication Modal */}
      <SessionTimeoutModal
        isOpen={isSessionTimeoutOpen}
        onReauthenticated={() => {
          setIsSessionTimeoutOpen(false);
          checkAuth();
          addToast({ type: 'success', message: 'Session re-authenticated. Changes preserved.' });
        }}
      />

      {/* Global Quick Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleDirectNavigate}
      />
    </>
  );
}
