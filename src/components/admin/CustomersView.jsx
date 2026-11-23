// src/components/admin/CustomersView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  GitMerge, 
  Mail, 
  Phone, 
  ShoppingBag, 
  FileText, 
  Tag, 
  Check, 
  X,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { formatINR } from '../../utils/formatters';
import useToastStore from '../../store/toastStore';

export default function CustomersView({ initialCustomerId, onClearInitialCustomer, onNavigate }) {
  const addToast = useToastStore((s) => s.addToast);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Customer Detail Drawer
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Merge Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [primaryMergeId, setPrimaryMergeId] = useState('');
  const [secondaryMergeId, setSecondaryMergeId] = useState('');
  const [submittingMerge, setSubmittingMerge] = useState(false);

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', email: '', phone: '', gstin: '', notes: '' });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await adminApi.getCustomers({ search });
    if (res.data?.customers) setCustomers(res.data.customers);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (initialCustomerId) {
      openCustomerDetail(initialCustomerId);
      if (onClearInitialCustomer) onClearInitialCustomer();
    }
  }, [initialCustomerId]);

  const openCustomerDetail = async (id) => {
    setLoadingDetail(true);
    const res = await adminApi.getCustomer(id);
    setLoadingDetail(false);
    if (res.data?.customer) {
      setSelectedCustomer(res.data.customer);
    }
  };

  // Merge Submit
  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    if (!primaryMergeId || !secondaryMergeId || primaryMergeId === secondaryMergeId) {
      addToast({ type: 'error', message: 'Please select two distinct accounts to merge.' });
      return;
    }

    setSubmittingMerge(true);
    const res = await adminApi.mergeCustomers({
      primaryId: primaryMergeId,
      secondaryId: secondaryMergeId
    });
    setSubmittingMerge(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: 'Customer records merged successfully!' });
      setIsMergeModalOpen(false);
      setPrimaryMergeId('');
      setSecondaryMergeId('');
      fetchCustomers();
    }
  };

  // Add Customer Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newCust.name || !newCust.email) return;

    setSubmittingAdd(true);
    const res = await adminApi.createCustomer(newCust);
    setSubmittingAdd(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: `Customer profile for ${newCust.name} created.` });
      setIsAddModalOpen(false);
      setNewCust({ name: '', email: '', phone: '', gstin: '', notes: '' });
      fetchCustomers();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Customer CRM & Lifetime Value
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Directory of retail buyers, B2B corporate accounts, lifetime spend metrics, and duplicate account consolidation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMergeModalOpen(true)}
            className="px-3 py-1.5 border border-[#EAEAEA] bg-white text-xs font-mono uppercase tracking-wider text-[#0A0A0A] hover:border-[#0A0A0A] flex items-center gap-1.5 transition-colors"
          >
            <GitMerge className="w-3.5 h-3.5" />
            Merge Accounts
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-white border border-[#EAEAEA] flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
              <th className="p-3">Customer</th>
              <th className="p-3">Contact Information</th>
              <th className="p-3">GSTIN</th>
              <th className="p-3 text-center">Orders Placed</th>
              <th className="p-3 text-right">Lifetime Value (LTV)</th>
              <th className="p-3">Tags</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {loading && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                  Loading customer database...
                </td>
              </tr>
            )}

            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-xs text-[#6B6B6B]">
                  No customers found matching search.
                </td>
              </tr>
            )}

            {!loading && customers.map(c => (
              <tr key={c.id} className="hover:bg-[#FBFBFB]">
                <td className="p-3">
                  <div className="font-semibold text-[#0A0A0A]">{c.name}</div>
                  <div className="text-[11px] text-[#6B6B6B] font-mono">ID: #{c.id}</div>
                </td>

                <td className="p-3 font-mono text-[11px]">
                  <div className="text-[#0A0A0A]">{c.email}</div>
                  {c.phone && <div className="text-[#6B6B6B]">{c.phone}</div>}
                </td>

                <td className="p-3 font-mono text-[#6B6B6B]">
                  {c.gstin || '—'}
                </td>

                <td className="p-3 text-center font-mono font-bold">
                  {c.ordersCount || 0}
                </td>

                <td className="p-3 text-right font-mono font-bold text-sm text-[#0A0A0A]">
                  {formatINR(c.totalSpent || 0)}
                </td>

                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.tags || []).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-[#444] text-[10px] font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="p-3 text-right">
                  <button
                    onClick={() => openCustomerDetail(c.id)}
                    className="px-2.5 py-1 text-xs font-mono uppercase bg-[#0A0A0A] text-white hover:bg-[#FF4D00] transition-colors"
                  >
                    Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* CUSTOMER DETAIL DRAWER */}
      {/* ======================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-150">
            <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-lg font-bold font-mono text-[#0A0A0A]">
                  {selectedCustomer.name}
                </h2>
                <p className="text-xs text-[#6B6B6B] font-mono">
                  {selectedCustomer.email} {selectedCustomer.phone ? `• ${selectedCustomer.phone}` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* LTV & Stats Summary */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 border border-[#EAEAEA] font-mono text-center">
                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase">Total Orders</div>
                  <div className="text-base font-bold text-[#0A0A0A] mt-0.5">{selectedCustomer.orders?.length || 0}</div>
                </div>

                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase">Lifetime Spent</div>
                  <div className="text-base font-bold text-[#0A0A0A] mt-0.5">
                    {formatINR((selectedCustomer.orders || []).reduce((acc, o) => acc + o.total, 0))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase">Promo Savings</div>
                  <div className="text-base font-bold text-[#FF4D00] mt-0.5">
                    {formatINR(selectedCustomer.totalSavings || 0)}
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div className="border border-[#EAEAEA]">
                <div className="p-3 bg-[#F7F7F7] font-mono text-xs uppercase font-bold text-[#0A0A0A] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FF4D00]" />
                  Order History ({selectedCustomer.orders?.length || 0})
                </div>
                <div className="divide-y divide-[#F0F0F0] text-xs font-mono">
                  {(selectedCustomer.orders || []).map(ord => (
                    <div key={ord.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <div className="font-bold text-[#0A0A0A]">{ord.order_number}</div>
                        <div className="text-[11px] text-[#6B6B6B]">{new Date(ord.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#0A0A0A]">{formatINR(ord.total)}</div>
                        <span className="text-[10px] uppercase font-bold">{ord.status}</span>
                      </div>
                    </div>
                  ))}

                  {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                    <div className="p-4 text-center text-[#999] text-xs">No orders recorded yet.</div>
                  )}
                </div>
              </div>

              {/* Invoice History */}
              <div className="border border-[#EAEAEA]">
                <div className="p-3 bg-[#F7F7F7] font-mono text-xs uppercase font-bold text-[#0A0A0A] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF4D00]" />
                  Tax Invoice History ({selectedCustomer.invoices?.length || 0})
                </div>
                <div className="divide-y divide-[#F0F0F0] text-xs font-mono">
                  {(selectedCustomer.invoices || []).map(inv => (
                    <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <div className="font-bold text-[#0A0A0A]">{inv.invoice_number}</div>
                        <div className="text-[11px] text-[#6B6B6B]">{inv.invoice_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#0A0A0A]">{formatINR(inv.total)}</div>
                        <span className="text-[10px] uppercase">{inv.status}</span>
                      </div>
                    </div>
                  ))}

                  {(!selectedCustomer.invoices || selectedCustomer.invoices.length === 0) && (
                    <div className="p-4 text-center text-[#999] text-xs">No invoices generated yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MERGE DUPLICATE CUSTOMERS MODAL */}
      {/* ======================================================== */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#0A0A0A] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A] flex items-center gap-1.5">
                  <GitMerge className="w-4 h-4 text-[#FF4D00]" />
                  Merge Duplicate Accounts
                </h3>
                <p className="text-[11px] text-[#6B6B6B]">Reassigns orders and invoices from secondary to primary</p>
              </div>
              <button onClick={() => setIsMergeModalOpen(false)} className="p-1">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleMergeSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">
                  Primary Account (Keep this one) *
                </label>
                <select
                  required
                  value={primaryMergeId}
                  onChange={(e) => setPrimaryMergeId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#CCC] bg-white outline-none"
                >
                  <option value="">Select Primary Account...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">
                  Secondary Account (Merge & Delete this one) *
                </label>
                <select
                  required
                  value={secondaryMergeId}
                  onChange={(e) => setSecondaryMergeId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#CCC] bg-white outline-none"
                >
                  <option value="">Select Duplicate Account...</option>
                  {customers.filter(c => String(c.id) !== String(primaryMergeId)).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="flex-1 py-2 border border-[#CCC] uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMerge}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white uppercase hover:bg-[#FF4D00] transition-colors font-bold"
                >
                  {submittingMerge ? 'Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD CUSTOMER MODAL */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#0A0A0A] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  New Customer Profile
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">GSTIN (Optional B2B)</label>
                <input
                  type="text"
                  value={newCust.gstin}
                  onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono outline-none uppercase"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 border border-[#CCC] text-xs font-mono uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white text-xs font-mono uppercase hover:bg-[#FF4D00] transition-colors font-bold"
                >
                  {submittingAdd ? 'Saving...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
