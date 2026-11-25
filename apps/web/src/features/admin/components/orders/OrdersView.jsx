// src/components/admin/OrdersView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Printer, 
  FileText, 
  Truck, 
  X, 
  Plus, 
  User, 
  MapPin 
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import { formatINR } from '@shared/utils/formatters';
import useToastStore from '@shared/store/toastStore';
import { PackingSlipModal } from '@features/admin/components/AdminModals';

export default function OrdersView({ initialOrderId, onClearInitialOrder, onNavigate }) {
  const addToast = useToastStore((s) => s.addToast);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all'); // 'all', 'retail', 'wholesale'

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [_loadingDetail, setLoadingDetail] = useState(false);

  // Editable fields in detail modal
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Packing Slip Modal
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);

  // Manual Walk-in Order Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualCustomer, setManualCustomer] = useState({ name: '', email: '', phone: '' });
  const [manualAddress, _setManualAddress] = useState({ line1: 'Store Walk-in', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' });
  const [manualItems, setManualItems] = useState([{ productId: '', quantity: 1 }]);
  const [manualPaymentMethod, setManualPaymentMethod] = useState('cash');
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Load orders
  const fetchOrders = async () => {
    setLoading(true);
    const res = await adminApi.getOrders({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
      channel: channelFilter !== 'all' ? channelFilter : undefined,
      search,
      limit: 100
    });
    if (res.data?.orders) {
      setOrders(res.data.orders);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentFilter, channelFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Load product catalog for manual order picker
  useEffect(() => {
    adminApi.getProducts({ limit: 150 }).then(res => {
      if (res.data?.products) setCatalogProducts(res.data.products);
    }).catch(() => {});
  }, []);

  // Handle Initial Order ID if passed
  useEffect(() => {
    if (initialOrderId) {
      openOrderDetail(initialOrderId);
      if (onClearInitialOrder) onClearInitialOrder();
    }
  }, [initialOrderId]);

  // Open Order Details
  const openOrderDetail = async (id) => {
    setLoadingDetail(true);
    const res = await adminApi.getOrder(id);
    setLoadingDetail(false);

    if (res.data?.order) {
      const ord = res.data.order;
      setSelectedOrder(ord);
      setCourierName(ord.courier_name || '');
      setTrackingNumber(ord.tracking_number || '');
      setInternalNotes(ord.internal_notes || '');
      setStatusNote('');
    }
  };

  // Save Courier & Notes
  const handleSaveOrderMeta = async () => {
    if (!selectedOrder) return;
    setSavingDetails(true);
    const res = await adminApi.updateOrder(selectedOrder.id, {
      courierName,
      trackingNumber,
      internalNotes
    });
    setSavingDetails(false);

    if (!res.error) {
      addToast({ type: 'success', message: 'Tracking details and internal notes saved.' });
      openOrderDetail(selectedOrder.id);
      fetchOrders();
    }
  };

  // Change Status
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrder) return;
    if (newStatus === 'Cancelled') {
      if (!window.confirm('Cancelling this order will automatically restore product inventory. Confirm cancellation?')) {
        return;
      }
    }

    setSavingDetails(true);
    const res = await adminApi.updateOrder(selectedOrder.id, {
      status: newStatus,
      note: statusNote || `Order marked as ${newStatus} by admin.`
    });
    setSavingDetails(false);

    if (!res.error) {
      addToast({ type: 'success', message: `Order status updated to ${newStatus}.` });
      setStatusNote('');
      openOrderDetail(selectedOrder.id);
      fetchOrders();
    }
  };

  // 1-Click Create Invoice from Order
  const handleCreateInvoice = async () => {
    if (!selectedOrder) return;
    const res = await adminApi.createInvoiceFromOrder(selectedOrder.id);
    if (res.data?.invoiceNumber) {
      addToast({ type: 'success', message: `Created Tax Invoice ${res.data.invoiceNumber}` });
      openOrderDetail(selectedOrder.id);
      if (onNavigate) {
        onNavigate('invoices');
      }
    }
  };

  // Handle Manual Order Submission
  const handleManualOrderSubmit = async (e) => {
    e.preventDefault();
    if (!manualCustomer.name) {
      addToast({ type: 'error', message: 'Customer name is required' });
      return;
    }
    const validItems = manualItems.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      addToast({ type: 'error', message: 'Please select at least one product' });
      return;
    }

    setSubmittingManual(true);
    const res = await adminApi.createManualOrder({
      customer: manualCustomer,
      shippingAddress: manualAddress,
      items: validItems,
      paymentMethod: manualPaymentMethod
    });
    setSubmittingManual(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: `Manual Order ${res.data?.orderNumber} created!` });
      setIsManualModalOpen(false);
      setManualItems([{ productId: '', quantity: 1 }]);
      fetchOrders();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Order Management & Fulfillment
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Process online checkouts, assign couriers, print packing slips, and generate tax invoices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-3 py-1.5 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase tracking-wider hover:bg-accent flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Manual / Walk-In Order
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white border border-[#EAEAEA] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex text-xs font-mono uppercase">
            {['all', 'Placed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 border ${
                  statusFilter === st
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-white text-[#6B6B6B] border-[#EAEAEA] hover:border-[#0A0A0A]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Payment Method */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#EAEAEA] text-xs font-mono bg-white outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="card">Cards / Netbanking</option>
            <option value="upi">UPI Instant</option>
            <option value="cod">Cash on Delivery</option>
            <option value="bank_transfer">Bank Transfer (B2B)</option>
            <option value="credit_terms">Credit Line (Net 30)</option>
            <option value="advance_50">50% Advance</option>
            <option value="cash">Walk-in Cash</option>
          </select>

          {/* Channel Selector */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#EAEAEA] text-xs font-mono bg-white outline-none"
          >
            <option value="all">All Channels</option>
            <option value="retail">Retail Storefront</option>
            <option value="wholesale">Wholesale B2B</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="Search order #, customer, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none w-64"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
              <th className="p-3">Order Number</th>
              <th className="p-3">Channel</th>
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3 text-center">Items</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Payment</th>
              <th className="p-3 text-center">Courier / Tracking</th>
              <th className="p-3 text-center">Fulfillment Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {loading && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                  Loading orders...
                </td>
              </tr>
            )}

            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-xs text-[#6B6B6B]">
                  No orders found matching the filter criteria.
                </td>
              </tr>
            )}

            {!loading && orders.map(ord => (
              <tr key={ord.id} className="hover:bg-[#FBFBFB]">
                <td className="p-3 font-mono font-bold text-[#0A0A0A]">
                  {ord.order_number}
                </td>

                <td className="p-3 font-mono text-[10px]">
                  {ord.channel === 'wholesale' ? (
                    <span className="px-1.5 py-0.5 rounded font-bold uppercase bg-accent-tint text-accent-text border border-accent-border">
                      Wholesale
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded font-medium uppercase bg-neutral-100 text-[#6B6B6B]">
                      Retail
                    </span>
                  )}
                </td>

                <td className="p-3 font-mono text-[#6B6B6B] text-[11px]">
                  {new Date(ord.created_at).toLocaleDateString()}
                </td>

                <td className="p-3">
                  <div className="font-semibold text-[#0A0A0A]">{ord.guest_name}</div>
                  <div className="text-[11px] font-mono text-[#6B6B6B]">{ord.guest_email}</div>
                </td>

                <td className="p-3 text-center font-mono font-semibold">
                  {ord.itemsCount || 1}
                </td>

                <td className="p-3 text-right font-mono font-bold text-sm text-[#0A0A0A]">
                  {formatINR(ord.total)}
                </td>

                <td className="p-3 text-center font-mono">
                  <span className="uppercase text-[10px] px-1.5 py-0.5 bg-gray-100 font-semibold">
                    {ord.payment_method}
                  </span>
                </td>

                <td className="p-3 text-center font-mono text-[11px] text-[#6B6B6B]">
                  {ord.courier_name ? (
                    <div>
                      <div className="text-[#0A0A0A] font-semibold">{ord.courier_name}</div>
                      <div className="text-[10px]">{ord.tracking_number || 'No AWB'}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </td>

                <td className="p-3 text-center font-mono">
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold ${
                    ord.status === 'Delivered' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : ord.status === 'Cancelled'
                      ? 'bg-red-100 text-red-700'
                      : ord.status === 'Shipped' || ord.status === 'Out for delivery'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-black text-white'
                  }`}>
                    {ord.status}
                  </span>
                </td>

                <td className="p-3 text-right">
                  <button
                    onClick={() => openOrderDetail(ord.id)}
                    className="px-2.5 py-1 text-xs font-mono uppercase bg-[#0A0A0A] text-white hover:text-accent-contrast hover:bg-accent transition-colors"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* ORDER DETAIL DRAWER / MODAL */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-150">
            {/* Header */}
            <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-[#0A0A0A]">
                    {selectedOrder.order_number}
                  </h2>
                  <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono uppercase">
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPackingSlipOpen(true)}
                  className="px-2.5 py-1.5 border border-[#EAEAEA] text-xs font-mono uppercase flex items-center gap-1 hover:border-[#0A0A0A]"
                  title="Print Packing Slip"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Slip
                </button>

                {selectedOrder.linkedInvoice ? (
                  <button
                    onClick={() => onNavigate && onNavigate('invoices')}
                    className="px-2.5 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-mono uppercase flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {selectedOrder.linkedInvoice.invoice_number}
                  </button>
                ) : (
                  <button
                    onClick={handleCreateInvoice}
                    className="px-2.5 py-1.5 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase hover:bg-accent flex items-center gap-1 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    1-Click Invoice
                  </button>
                )}

                <button onClick={() => setSelectedOrder(null)} className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer & Address Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 border border-[#EAEAEA] space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B6B] flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" /> Customer Profile
                  </div>
                  <div className="font-bold text-sm text-[#0A0A0A]">{selectedOrder.guest_name}</div>
                  <div className="text-xs font-mono text-[#6B6B6B]">{selectedOrder.guest_email}</div>
                  <div className="text-xs font-mono text-[#6B6B6B]">{selectedOrder.guest_phone}</div>
                </div>

                <div className="p-4 bg-gray-50 border border-[#EAEAEA] space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B6B] flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3" /> Shipping Address
                  </div>
                  <div className="text-xs text-[#0A0A0A] whitespace-pre-line leading-relaxed">
                    {selectedOrder.shippingAddress?.addressLine || selectedOrder.shippingAddress?.line1 || ''}<br />
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.pincode}
                  </div>
                </div>
              </div>

              {/* Status Updater Buttons */}
              <div className="p-4 bg-white border border-[#EAEAEA] space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A]">
                  Update Fulfillment Stage
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Placed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'].map(st => (
                    <button
                      key={st}
                      type="button"
                      disabled={savingDetails || selectedOrder.status === st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors border ${
                        selectedOrder.status === st
                          ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                          : st === 'Cancelled'
                          ? 'border-red-300 text-red-600 hover:bg-red-50'
                          : 'border-[#EAEAEA] hover:border-[#0A0A0A]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Optional status note (e.g. Handed over to Bluedart hub)..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
                />
              </div>

              {/* Courier & Tracking Edit Box */}
              <div className="p-4 bg-white border border-[#EAEAEA] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A] flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-accent-text" />
                    Courier Dispatch & Tracking
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveOrderMeta}
                    disabled={savingDetails}
                    className="px-3 py-1 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase hover:bg-accent transition-colors"
                  >
                    Save Details
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Courier Partner</label>
                    <input
                      type="text"
                      placeholder="e.g. Bluedart Express, Delhivery, DTDC"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">AWB / Tracking Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 88392109283"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Ordered Items Table */}
              <div className="border border-[#EAEAEA]">
                <div className="p-3 bg-[#F7F7F7] font-mono text-xs uppercase font-bold text-[#0A0A0A]">
                  Ordered Items ({selectedOrder.items?.length || 0})
                </div>
                <div className="divide-y divide-[#F0F0F0]">
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={it.image || '/images/placeholder-product.svg'}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/placeholder-product.svg';
                          }}
                          className="w-10 h-10 object-contain bg-white border border-[#EAEAEA] p-0.5"
                        />
                        <div>
                          <div className="font-semibold text-[#0A0A0A]">{it.product_name || it.name}</div>
                          <div className="text-[11px] font-mono text-[#6B6B6B]">Qty: {it.quantity} × {formatINR(it.price)}</div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-sm text-[#0A0A0A]">
                        {formatINR(it.price * it.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing Summary */}
                <div className="p-4 bg-gray-50 border-t border-[#EAEAEA] space-y-1.5 font-mono text-xs text-right">
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Subtotal:</span>
                    <span>{formatINR(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-accent-text">
                      <span>Discount ({selectedOrder.discount_code || 'PROMO'}):</span>
                      <span>-{formatINR(selectedOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Shipping:</span>
                    <span>{selectedOrder.shipping === 0 ? 'FREE' : formatINR(selectedOrder.shipping)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#0A0A0A] pt-2 border-t border-[#CCC]">
                    <span>Total Paid:</span>
                    <span>{formatINR(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                  Internal Back-Office Notes (Private)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Record customer preferences, support tickets, or warehouse packaging notes..."
                  className="w-full px-3 py-2 border border-[#EAEAEA] text-xs outline-none"
                />
              </div>

              {/* Status History Timeline */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#6B6B6B]">Status Audit History:</div>
                  <div className="border-l-2 border-[#0A0A0A] pl-3 space-y-2 text-xs font-mono">
                    {selectedOrder.statusHistory.map((h, i) => (
                      <div key={i} className="text-[#6B6B6B]">
                        <span className="font-bold text-[#0A0A0A] uppercase">{h.status}</span> • {new Date(h.timestamp).toLocaleString()}
                        {h.note && <div className="text-[11px] text-[#444] font-sans">{h.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PACKING SLIP MODAL */}
      {/* ======================================================== */}
      {isPackingSlipOpen && selectedOrder && (
        <PackingSlipModal
          order={selectedOrder}
          isOpen={isPackingSlipOpen}
          onClose={() => setIsPackingSlipOpen(false)}
        />
      )}

      {/* ======================================================== */}
      {/* MANUAL WALK-IN / TELEPHONE ORDER MODAL */}
      {/* ======================================================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white border border-[#0A0A0A] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  New Manual Walk-In / Telephone Sale
                </h3>
                <p className="text-[11px] text-[#6B6B6B]">Instantly book a direct sale and decrement stock</p>
              </div>
              <button onClick={() => setIsManualModalOpen(false)} className="p-1">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleManualOrderSubmit} className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={manualCustomer.name}
                    onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={manualCustomer.phone}
                    onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                    placeholder="Phone number"
                    className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {/* Item Selection */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-mono uppercase text-[#6B6B6B]">Items to Purchase</label>
                  <button
                    type="button"
                    onClick={() => setManualItems([...manualItems, { productId: '', quantity: 1 }])}
                    className="text-[10px] font-mono uppercase text-accent-text hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {manualItems.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        required
                        value={it.productId}
                        onChange={(e) => {
                          const updated = [...manualItems];
                          updated[idx].productId = e.target.value;
                          setManualItems(updated);
                        }}
                        className="flex-1 px-3 py-1.5 border border-[#EAEAEA] text-xs outline-none bg-white font-mono"
                      >
                        <option value="">Select Catalog Product...</option>
                        {catalogProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.price} • Stock: {p.stock})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...manualItems];
                          updated[idx].quantity = Number(e.target.value);
                          setManualItems(updated);
                        }}
                        className="w-16 px-2 py-1.5 border border-[#EAEAEA] text-xs font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => setManualItems(manualItems.filter((_, i) => i !== idx))}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  {['cash', 'upi', 'card'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setManualPaymentMethod(m)}
                      className={`py-2 px-2 border uppercase text-center ${
                        manualPaymentMethod === m ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white border-[#EAEAEA]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 py-2 border border-[#EAEAEA] text-xs font-mono uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase hover:bg-accent transition-colors font-semibold"
                >
                  {submittingManual ? 'Creating...' : 'Create & Complete Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
