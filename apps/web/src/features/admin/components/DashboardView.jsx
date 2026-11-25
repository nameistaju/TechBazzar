// src/components/admin/DashboardView.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import { formatINR } from '@shared/utils/formatters';

export default function DashboardView({ onNavigate, onQuickRestock }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const fetchStats = async () => {
    setLoading(true);
    const res = await adminApi.getStats(range);
    if (res.data) setStats(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [range]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20 text-xs font-mono text-[#6B6B6B]">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading Back-Office Performance Data...
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="space-y-6">
      {/* Header Bar with Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Executive Business Dashboard
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Single-owner operations overview for TechBazaar Store
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['today', '7d', '30d', '90d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors border ${
                range === r 
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' 
                  : 'bg-white text-[#6B6B6B] border-[#EAEAEA] hover:border-[#0A0A0A]'
              }`}
            >
              {r === 'today' ? 'Today' : r.toUpperCase()}
            </button>
          ))}
          <button 
            onClick={fetchStats}
            title="Refresh Metrics"
            className="p-1.5 border border-[#EAEAEA] bg-white text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent-text' : ''}`} />
          </button>
        </div>
      </div>

      {/* 7 Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Revenue */}
        <div className="p-4 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] transition-colors col-span-2 sm:col-span-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B]">Total Revenue</div>
          <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1.5">{formatINR(s.revenue || 0)}</div>
          <div className="text-[10px] text-emerald-600 font-mono mt-1 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            Active Sales
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-4 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] transition-colors">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B]">Total Orders</div>
          <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1.5">{s.totalOrders || 0}</div>
          <div className="text-[10px] text-[#6B6B6B] font-mono mt-1">Lifetime Volume</div>
        </div>

        {/* AOV */}
        <div className="p-4 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] transition-colors">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B]">Avg Order Value</div>
          <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1.5">{formatINR(s.aov || 0)}</div>
          <div className="text-[10px] text-[#6B6B6B] font-mono mt-1">Per Checkout</div>
        </div>

        {/* Pending Orders */}
        <div 
          onClick={() => onNavigate('orders')}
          className="p-4 bg-white border border-[#EAEAEA] hover:border-accent transition-colors cursor-pointer group"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] group-hover:text-accent-text flex justify-between items-center">
            Pending Orders
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1.5">{s.pendingOrders || 0}</div>
          <div className="text-[10px] text-accent-text font-mono mt-1 font-medium">To Fulfill</div>
        </div>

        {/* Low Stock Count */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="p-4 bg-white border border-[#EAEAEA] hover:border-accent transition-colors cursor-pointer group"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] group-hover:text-accent-text flex justify-between items-center">
            Low Stock Alerts
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold font-mono text-accent-text mt-1.5">{s.lowStockCount || 0}</div>
          <div className="text-[10px] text-[#6B6B6B] font-mono mt-1">Needs Restock</div>
        </div>

        {/* Total Customers */}
        <div 
          onClick={() => onNavigate('customers')}
          className="p-4 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] transition-colors cursor-pointer group"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] flex justify-between items-center">
            Customers
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1.5">{s.totalCustomers || 0}</div>
          <div className="text-[10px] text-[#6B6B6B] font-mono mt-1">CRM Directory</div>
        </div>

        {/* Unpaid Invoices */}
        <div 
          onClick={() => onNavigate('invoices')}
          className="p-4 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] transition-colors cursor-pointer group"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] flex justify-between items-center">
            Unpaid Invoices
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold font-mono text-[#0A0A0A] mt-1.5">{formatINR(s.unpaidInvoicesAmount || 0)}</div>
          <div className="text-[10px] text-[#6B6B6B] font-mono mt-1">{s.unpaidInvoicesCount || 0} invoice(s)</div>
        </div>
      </div>

      {/* Channel Breakdown Split (Retail vs Wholesale) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-[#EAEAEA] rounded-[4px] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B6B] block">
              Retail Channel
            </span>
            <span className="text-lg font-bold font-mono text-[#0A0A0A]">
              {formatINR(s.retailStats?.revenue || 0)}
            </span>
            <span className="text-[10px] text-[#8A8A8A] block">
              {s.retailStats?.orders || 0} consumer orders
            </span>
          </div>
          <span className="px-2 py-1 rounded bg-neutral-100 text-[#0A0A0A] text-xs font-mono font-bold">
            B2C
          </span>
        </div>

        <div className="p-4 bg-white border border-[#EAEAEA] rounded-[4px] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-text block font-bold">
              Wholesale Channel
            </span>
            <span className="text-lg font-bold font-mono text-[#0A0A0A]">
              {formatINR(s.wholesaleStats?.revenue || 0)}
            </span>
            <span className="text-[10px] text-[#8A8A8A] block">
              {s.wholesaleStats?.orders || 0} commercial orders
            </span>
          </div>
          <span className="px-2 py-1 rounded bg-accent-tint text-accent-text text-xs font-mono font-bold border border-accent-border">
            B2B
          </span>
        </div>

        <div 
          onClick={() => onNavigate('customers')}
          className="p-4 bg-white border border-[#EAEAEA] hover:border-accent rounded-[4px] flex items-center justify-between cursor-pointer group"
        >
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B6B] block">
              Pending B2B Applications
            </span>
            <span className="text-lg font-bold font-mono text-accent-text">
              {s.pendingApplications || 0}
            </span>
            <span className="text-[10px] text-[#8A8A8A] block">
              Awaiting verification
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#6B6B6B] group-hover:text-accent-text">
            <span>Review</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Revenue & Orders Timeline Chart */}
        <div className="lg:col-span-2 p-5 bg-white border border-[#EAEAEA]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                Sales & Orders Trajectory
              </h3>
              <p className="text-[11px] text-[#6B6B6B]">Daily revenue trends over current period</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-accent"></span> Revenue (₹)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#0A0A0A]"></span> Orders
              </span>
            </div>
          </div>

          {/* Clean SVG Time Series */}
          {s.timeline && s.timeline.length > 0 ? (
            <div className="h-56 w-full flex items-end gap-1 sm:gap-2 pt-6 pb-2 border-b border-[#EAEAEA]">
              {(() => {
                const maxRev = Math.max(...s.timeline.map(t => t.revenue), 1000);
                return s.timeline.map((point, idx) => {
                  const revHeight = Math.max(4, Math.round((point.revenue / maxRev) * 160));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A0A0A] text-white text-[10px] font-mono py-1 px-2 whitespace-nowrap pointer-events-none z-10">
                        {point.date}: {formatINR(point.revenue)} ({point.orders} orders)
                      </div>

                      {/* Bar */}
                      <div 
                        style={{ height: `${revHeight}px` }} 
                        className={`w-full transition-all ${point.revenue > 0 ? 'bg-accent hover:bg-[#0A0A0A]' : 'bg-[#F0F0F0]'}`}
                      />
                      
                      {/* X label */}
                      {idx % Math.ceil(s.timeline.length / 7) === 0 && (
                        <span className="text-[9px] font-mono text-[#999] mt-2 absolute -bottom-6">
                          {point.label}
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs font-mono text-[#999]">
              No transaction history available in this timeframe.
            </div>
          )}
        </div>

        {/* 2. Category Distribution & Payment Split */}
        <div className="space-y-6">
          {/* Sales by Category */}
          <div className="p-5 bg-white border border-[#EAEAEA]">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A] mb-3">
              Sales by Category
            </h3>
            <div className="space-y-3">
              {(s.categorySplit && s.categorySplit.length > 0 ? s.categorySplit : [
                { category: 'Audio & Sound', revenue: 45000, units_sold: 18 },
                { category: 'Wearables', revenue: 28000, units_sold: 12 },
                { category: 'Accessories', revenue: 15000, units_sold: 34 }
              ]).map((c, i) => {
                const totalCatRev = (s.categorySplit || []).reduce((acc, x) => acc + x.revenue, 0) || 1;
                const pct = Math.round((c.revenue / totalCatRev) * 100);
                return (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between font-mono mb-1">
                      <span className="font-medium text-[#0A0A0A] capitalize">{c.category}</span>
                      <span className="text-[#6B6B6B]">{formatINR(c.revenue)} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F0F0F0] overflow-hidden">
                      <div 
                        style={{ width: `${Math.max(8, pct)}%` }} 
                        className={`h-full ${i === 0 ? 'bg-accent' : 'bg-[#0A0A0A]'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-5 bg-white border border-[#EAEAEA]">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A] mb-3">
              Payment Method Share
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              {(s.paymentSplit || []).map((pm, i) => (
                <div key={i} className="p-2 border border-[#EAEAEA] bg-[#F7F7F7]">
                  <div className="text-[10px] text-[#6B6B6B] uppercase">{pm.payment_method}</div>
                  <div className="font-bold text-[#0A0A0A] mt-0.5">{pm.count}</div>
                  <div className="text-[10px] text-[#6B6B6B]">{formatINR(pm.revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Lists: Low Stock Alerts & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="p-5 bg-white border border-[#EAEAEA]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent-text" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                Critical Stock Alerts ({s.lowStockAlerts?.length || 0})
              </h3>
            </div>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-xs font-mono text-[#6B6B6B] hover:text-[#0A0A0A] flex items-center gap-1"
            >
              Manage Inventory <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#F0F0F0]">
            {(s.lowStockAlerts || []).slice(0, 5).map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={p.image || '/images/placeholder-product.svg'}
                    alt={p.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/placeholder-product.svg';
                    }}
                    className="w-8 h-8 object-contain bg-white border border-[#EAEAEA] p-0.5"
                  />
                  <div>
                    <div className="text-xs font-medium text-[#0A0A0A] line-clamp-1">{p.name}</div>
                    <div className="text-[11px] font-mono text-[#6B6B6B]">SKU: {p.sku || p.id}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 ${p.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-accent-tint text-accent-text'}`}>
                    {p.stock === 0 ? 'Out of Stock' : `${p.stock} left`}
                  </span>
                  <button
                    onClick={() => onQuickRestock && onQuickRestock(p)}
                    className="px-2.5 py-1 text-[11px] font-mono uppercase bg-[#0A0A0A] text-accent-contrast hover:bg-accent transition-colors"
                  >
                    Restock
                  </button>
                </div>
              </div>
            ))}

            {(!s.lowStockAlerts || s.lowStockAlerts.length === 0) && (
              <div className="py-8 text-center text-xs font-mono text-emerald-600">
                All inventory levels are currently above reorder thresholds.
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices & Recent Orders */}
        <div className="p-5 bg-white border border-[#EAEAEA]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
              Recent Orders & Fulfillment
            </h3>
            <button 
              onClick={() => onNavigate('orders')}
              className="text-xs font-mono text-[#6B6B6B] hover:text-[#0A0A0A] flex items-center gap-1"
            >
              All Orders <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#F0F0F0]">
            {(s.recentOrders || []).slice(0, 5).map((ord) => (
              <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-[#0A0A0A]">{ord.order_number}</div>
                  <div className="text-[11px] text-[#6B6B6B]">{ord.guest_name} • {new Date(ord.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#0A0A0A]">{formatINR(ord.total)}</div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-black text-white">{ord.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
