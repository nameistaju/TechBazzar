// src/components/admin/AdminModals.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Search, 
  Package, 
  ShoppingBag, 
  FileText, 
  Users, 
  Printer, 
  Check, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import authApi from '../../api/authApi';
import { formatINR } from '../../utils/formatters';

/**
 * Force Password Change Modal (Shown on First Login)
 */
export function ForcePasswordChangeModal({ isOpen, onClose, onPasswordChanged }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await adminApi.changePassword({ newPassword });
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      onPasswordChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-[#0A0A0A] p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4 text-[#FF4D00]">
          <div className="w-10 h-10 rounded-full bg-[#FF4D00]/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#FF4D00]" />
          </div>
          <div>
            <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-[#0A0A0A]">Security Requirement</h3>
            <p className="text-xs text-[#6B6B6B]">Initial Sign-in Password Update</p>
          </div>
        </div>

        <p className="text-sm text-[#333] mb-6 leading-relaxed">
          Welcome to your TechBazaar back-office. Because this is your first sign-in with temporary seed credentials, you must set a new secure password before accessing store controls.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#0A0A0A] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#FF4D00] transition-colors font-semibold flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : 'Set New Password & Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Session Timeout Re-Login Modal (Keeps Unsaved Work Safe)
 */
export function SessionTimeoutModal({ isOpen, onReauthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await authApi.login({
      email: 'admin@techbazaar.com',
      password
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setPassword('');
      onReauthenticated();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white border border-[#0A0A0A] p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4 text-[#FF4D00]">
          <ShieldAlert className="w-6 h-6 text-[#FF4D00]" />
          <div>
            <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-[#0A0A0A]">Session Expired</h3>
            <p className="text-xs text-[#6B6B6B]">Unsaved form inputs are preserved</p>
          </div>
        </div>

        <p className="text-xs text-[#6B6B6B] mb-4 leading-relaxed">
          Your administrator session has timed out. Please enter your password to resume where you left off without reloading the page.
        </p>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
              Admin Password (admin@techbazaar.com)
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-[#0A0A0A] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#FF4D00] transition-colors"
          >
            {loading ? 'Verifying...' : 'Unlock & Continue Working'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Global Search Modal (Keyboard Shortcut: /)
 */
export function GlobalSearchModal({ isOpen, onClose, onNavigate }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState({ products: [], orders: [], invoices: [], customers: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTerm('');
      setResults({ products: [], orders: [], invoices: [], customers: [] });
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!term.trim()) {
      setResults({ products: [], orders: [], invoices: [], customers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const [pRes, oRes, iRes, cRes] = await Promise.all([
        adminApi.getProducts({ search: term, limit: 4 }),
        adminApi.getOrders({ search: term, limit: 4 }),
        adminApi.getInvoices({ search: term }),
        adminApi.getCustomers({ search: term })
      ]);

      setResults({
        products: pRes.data?.products || [],
        orders: oRes.data?.orders || [],
        invoices: (iRes.data?.invoices || []).slice(0, 4),
        customers: (cRes.data?.customers || []).slice(0, 4)
      });
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [term]);

  if (!isOpen) return null;

  const totalResults = results.products.length + results.orders.length + results.invoices.length + results.customers.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-16 sm:pt-24" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white border border-[#0A0A0A] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#EAEAEA] gap-3">
          <Search className="w-5 h-5 text-[#6B6B6B]" />
          <input
            type="text"
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products, order #, invoices, customer names or phones... (Esc to exit)"
            className="w-full bg-transparent text-sm outline-none text-[#0A0A0A] placeholder-[#999]"
          />
          <button onClick={onClose} className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {loading && (
            <div className="text-center py-8 text-xs font-mono text-[#6B6B6B]">
              Searching back-office database...
            </div>
          )}

          {!loading && term.trim() && totalResults === 0 && (
            <div className="text-center py-8 text-xs text-[#6B6B6B]">
              No records matching "{term}". Try searching with a different keyword or ID.
            </div>
          )}

          {!loading && !term.trim() && (
            <div className="text-center py-8 text-xs text-[#999] font-mono">
              Type to instantly query Products, Orders, Invoices, and Customers.
            </div>
          )}

          {/* Products Results */}
          {results.products.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-2">
                <Package className="w-3.5 h-3.5 text-[#FF4D00]" />
                Products ({results.products.length})
              </div>
              <div className="divide-y divide-[#F0F0F0] border border-[#F0F0F0]">
                {results.products.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { onNavigate('products', p.id); onClose(); }}
                    className="p-2.5 flex items-center justify-between hover:bg-[#F7F7F7] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-9 h-9 object-contain bg-white border border-[#EAEAEA] p-0.5" />
                      <div>
                        <div className="text-xs font-medium text-[#0A0A0A]">{p.name}</div>
                        <div className="text-[11px] font-mono text-[#6B6B6B]">SKU: {p.sku || p.id} • Stock: {p.stock}</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-semibold text-[#0A0A0A]">{formatINR(p.price)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders Results */}
          {results.orders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-2">
                <ShoppingBag className="w-3.5 h-3.5 text-[#FF4D00]" />
                Orders ({results.orders.length})
              </div>
              <div className="divide-y divide-[#F0F0F0] border border-[#F0F0F0]">
                {results.orders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => { onNavigate('orders', o.id); onClose(); }}
                    className="p-2.5 flex items-center justify-between hover:bg-[#F7F7F7] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-mono font-semibold text-[#0A0A0A]">{o.order_number}</div>
                      <div className="text-[11px] text-[#6B6B6B]">{o.guest_name} • {o.guest_email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-semibold text-[#0A0A0A]">{formatINR(o.total)}</div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-black text-white">{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices Results */}
          {results.invoices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-2">
                <FileText className="w-3.5 h-3.5 text-[#FF4D00]" />
                Invoices ({results.invoices.length})
              </div>
              <div className="divide-y divide-[#F0F0F0] border border-[#F0F0F0]">
                {results.invoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => { onNavigate('invoices', inv.id); onClose(); }}
                    className="p-2.5 flex items-center justify-between hover:bg-[#F7F7F7] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-mono font-semibold text-[#0A0A0A]">{inv.invoice_number}</div>
                      <div className="text-[11px] text-[#6B6B6B]">{inv.customer_name} • {inv.invoice_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-semibold text-[#0A0A0A]">{formatINR(inv.total)}</div>
                      <span className="text-[10px] font-mono text-[#6B6B6B]">Due: {formatINR(inv.balance_due)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers Results */}
          {results.customers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-2">
                <Users className="w-3.5 h-3.5 text-[#FF4D00]" />
                Customers ({results.customers.length})
              </div>
              <div className="divide-y divide-[#F0F0F0] border border-[#F0F0F0]">
                {results.customers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { onNavigate('customers', c.id); onClose(); }}
                    className="p-2.5 flex items-center justify-between hover:bg-[#F7F7F7] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-medium text-[#0A0A0A]">{c.name}</div>
                      <div className="text-[11px] font-mono text-[#6B6B6B]">{c.email} {c.phone ? `• ${c.phone}` : ''}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#999]" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#F7F7F7] border-t border-[#EAEAEA] flex items-center justify-between text-[11px] font-mono text-[#6B6B6B]">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-[#CCC] text-black">Esc</kbd> anytime to exit</span>
          <span>Click any row to jump to record</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Printable Packing Slip Modal
 */
export function PackingSlipModal({ order, settings, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white border border-[#0A0A0A] p-6 sm:p-8 shadow-2xl relative my-8 print:border-none print:shadow-none print:p-0 print:m-0">
        {/* Controls - Hidden on print */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#EAEAEA] print:hidden">
          <div className="font-mono text-xs uppercase tracking-wider font-semibold text-[#0A0A0A]">
            Order Packing Slip
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#FF4D00] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Slip
            </button>
            <button onClick={onClose} className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Packing Slip Document */}
        <div className="text-black space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-black pb-4">
            <div>
              <h1 className="text-xl font-bold font-mono tracking-tight uppercase">PACKING SLIP</h1>
              <p className="text-xs font-mono mt-1 text-[#444]">{settings?.business_trade_name || 'TechBazaar Store'}</p>
              <p className="text-[11px] text-[#666] max-w-xs">{settings?.business_address || 'Bengaluru, Karnataka'}</p>
            </div>
            <div className="text-right font-mono text-xs">
              <div className="font-bold text-sm">{order.order_number}</div>
              <div className="text-[#666]">Date: {new Date(order.created_at).toLocaleDateString()}</div>
              {order.courier_name && (
                <div className="text-[#333] mt-1">Courier: {order.courier_name}</div>
              )}
              {order.tracking_number && (
                <div className="text-[#333]">AWB: {order.tracking_number}</div>
              )}
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="p-3 border border-gray-200">
              <div className="font-mono font-bold uppercase tracking-wider text-[10px] text-gray-500 mb-1">Ship To</div>
              <div className="font-bold">{order.guest_name}</div>
              <div className="text-gray-700 mt-1 whitespace-pre-line">
                {order.shippingAddress?.addressLine || order.shippingAddress?.line1 || ''}<br />
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
              </div>
              <div className="mt-2 text-gray-600 font-mono">Tel: {order.guest_phone}</div>
            </div>

            <div className="p-3 border border-gray-200 font-mono text-[11px]">
              <div className="font-bold uppercase tracking-wider text-[10px] text-gray-500 mb-1">Dispatch Check</div>
              <div className="space-y-1">
                <div>Items Count: {order.items?.length || 0} line(s)</div>
                <div>Payment Method: {order.payment_method?.toUpperCase()}</div>
                <div>Payment Status: {order.payment_status || 'Paid'}</div>
                <div className="pt-2 text-[10px] text-gray-500">Packed By: ____________________</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs text-left border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100 font-mono uppercase text-[10px]">
                <th className="border border-black p-2 w-12 text-center">#</th>
                <th className="border border-black p-2">Item Description</th>
                <th className="border border-black p-2 w-20 text-center">Qty</th>
                <th className="border border-black p-2 w-24 text-center">Verified [✓]</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((it, idx) => (
                <tr key={idx} className="border-b border-gray-300">
                  <td className="border border-black p-2 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-2">
                    <div className="font-bold">{it.product_name || it.name}</div>
                    <div className="font-mono text-[10px] text-gray-500">ID: {it.product_id}</div>
                  </td>
                  <td className="border border-black p-2 text-center font-mono font-bold">{it.quantity}</td>
                  <td className="border border-black p-2 text-center">
                    <span className="inline-block w-4 h-4 border border-black"></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Notes */}
          <div className="border-t border-black pt-4 text-center text-[10px] text-gray-500 font-mono">
            Thank you for shopping at TechBazaar! For support or returns, visit techbazaar.in/track or email care@techbazaar.com.
          </div>
        </div>
      </div>
    </div>
  );
}
