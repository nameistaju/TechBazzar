// src/pages/AdminPage.jsx
// TechBazaar Single-Owner Complete Business Back-Office

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Search, 
  Plus, 
  Bell, 
  ExternalLink, 
  LogOut, 
  ChevronDown, 
  Check, 
  X, 
  AlertTriangle,
  Menu,
  ShieldCheck,
  Layers,
  MessageSquare
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import adminApi from '../api/adminApi';
import useToastStore from '../store/toastStore';

// Admin Sub-Views
import DashboardView from '../components/admin/DashboardView';
import ProductsView from '../components/admin/ProductsView';
import InventoryView from '../components/admin/InventoryView';
import OrdersView from '../components/admin/OrdersView';
import EstimatesView from '../components/admin/EstimatesView';
import InvoicesView from '../components/admin/InvoicesView';
import CustomersView from '../components/admin/CustomersView';
import DiscountsView from '../components/admin/DiscountsView';
import ReportsView from '../components/admin/ReportsView';
import SettingsView from '../components/admin/SettingsView';
import ActivityLogView from '../components/admin/ActivityLogView';
import BannersView from '../components/admin/BannersView';
import QuotesView from '../components/admin/QuotesView';

// Modals
import { 
  ForcePasswordChangeModal, 
  SessionTimeoutModal, 
  GlobalSearchModal 
} from '../components/admin/AdminModals';

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
    <div className="min-h-screen bg-[#F7F7F7] text-[#0A0A0A] flex flex-col font-sans">
      {/* ======================================================== */}
      {/* 1. TOP BAR */}
      {/* ======================================================== */}
      <header className="h-14 bg-white border-b border-[#EAEAEA] px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="TechBazaar" className="h-7 w-auto object-contain" />
            <span className="font-mono text-xs tracking-wider uppercase font-bold text-[#0A0A0A] hidden sm:inline">
              TECHBAZAAR <span className="text-[#FF4D00] font-normal">BACK-OFFICE</span>
            </span>
          </Link>
        </div>

        {/* Global Search Bar (Center / Shortcut: /) */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-between px-3 py-1.5 bg-[#F7F7F7] border border-[#EAEAEA] hover:border-[#0A0A0A] cursor-pointer text-xs font-mono text-[#6B6B6B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#999]" />
              <span>Search products, orders, invoices, clients...</span>
            </div>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#DDD] text-[10px] text-[#333]">
              /
            </kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* View Storefront Link */}
          <Link
            to="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1 text-xs font-mono uppercase text-[#6B6B6B] hover:text-[#FF4D00] transition-colors px-2 py-1"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          {/* Quick Create Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsQuickCreateOpen(!isQuickCreateOpen);
                setIsNotificationsOpen(false);
                setIsAccountMenuOpen(false);
              }}
              className="px-2.5 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1 transition-colors font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create</span>
              <kbd className="hidden lg:inline text-[9px] opacity-75 font-normal ml-0.5">N</kbd>
            </button>

            {isQuickCreateOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-[#0A0A0A] shadow-xl z-50 py-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    handleDirectNavigate('products');
                    setIsQuickCreateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <Package className="w-3.5 h-3.5 text-[#FF4D00]" />
                  New Product
                </button>
                <button
                  onClick={() => {
                    handleDirectNavigate('estimates');
                    setIsQuickCreateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#FF4D00]" />
                  New Estimate
                </button>
                <button
                  onClick={() => {
                    handleDirectNavigate('invoices');
                    setIsQuickCreateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#FF4D00]" />
                  New Tax Invoice
                </button>
                <button
                  onClick={() => {
                    handleDirectNavigate('orders');
                    setIsQuickCreateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FF4D00]" />
                  Manual Walk-in Order
                </button>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsQuickCreateOpen(false);
                setIsAccountMenuOpen(false);
              }}
              className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {(badges.lowStock > 0 || badges.pendingOrders > 0) && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF4D00]"></span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-[#0A0A0A] shadow-xl z-50 p-3 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="font-mono uppercase text-[10px] font-bold text-[#6B6B6B] mb-2 pb-1 border-b border-[#EAEAEA]">
                  Operational Notifications
                </div>
                <div className="space-y-2">
                  {notificationItems.length > 0 ? (
                    notificationItems.map((n, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          handleDirectNavigate(n.tab);
                          setIsNotificationsOpen(false);
                        }}
                        className="p-2 border border-[#EAEAEA] hover:border-[#0A0A0A] cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-[#0A0A0A]">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#FF4D00]" />
                          <span>{n.type === 'low_stock' ? 'Low Stock Warning' : 'Pending Fulfillment'}</span>
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] mt-0.5">{n.text}</div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-[#999] text-xs">
                      All systems operating smoothly. No urgent alerts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Owner Account Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setIsAccountMenuOpen(!isAccountMenuOpen);
                setIsQuickCreateOpen(false);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 pl-2 border-l border-[#EAEAEA] text-left"
            >
              <div className="w-7 h-7 bg-[#0A0A0A] text-white text-xs font-mono font-bold flex items-center justify-center rounded-full">
                TB
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-semibold leading-tight text-[#0A0A0A]">{user?.name || 'Administrator'}</div>
                <div className="text-[10px] font-mono text-[#6B6B6B]">Single Owner</div>
              </div>
              <ChevronDown className="w-3 h-3 text-[#6B6B6B]" />
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 top-10 w-52 bg-white border border-[#0A0A0A] shadow-xl z-50 py-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3 border-b border-[#EAEAEA]">
                  <div className="font-bold text-[#0A0A0A]">{user?.name}</div>
                  <div className="text-[10px] text-[#6B6B6B] truncate">{user?.email}</div>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Account Settings
                </button>

                <button
                  onClick={() => {
                    logout();
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-[#EAEAEA]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. BODY LAYOUT: COLLAPSIBLE SIDEBAR + MAIN CONTENT */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className={`${
          isSidebarOpen ? 'w-56' : 'w-16'
        } bg-white border-r border-[#EAEAEA] flex flex-col shrink-0 transition-all duration-150`}>
          <div className="flex-1 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={!isSidebarOpen ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors relative ${
                    isActive
                      ? 'bg-[#0A0A0A] text-white font-bold'
                      : 'text-[#6B6B6B] hover:bg-[#F7F7F7] hover:text-[#0A0A0A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF4D00]' : 'text-[#6B6B6B]'}`} />
                    {isSidebarOpen && <span>{item.label}</span>}
                  </div>

                  {isSidebarOpen && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 text-[10px] text-white font-bold rounded-full ${item.badgeColor || 'bg-black'}`}>
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
            <div className="p-4 border-t border-[#EAEAEA] text-[10px] font-mono text-[#999] leading-tight">
              <div>TechBazaar Single-Owner</div>
              <div>v2.0 • Bengaluru</div>
            </div>
          )}
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
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
          </div>
        </main>
      </div>

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
    </div>
  );
}
