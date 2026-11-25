// src/components/admin/EstimatesView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  ArrowRight, 
  X 
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { formatINR } from '../../utils/formatters';
import useToastStore from '../../store/toastStore';

export default function EstimatesView({ onNavigate }) {
  const addToast = useToastStore((s) => s.addToast);

  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estimate Builder State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [savingEstimate, setSavingEstimate] = useState(false);

  // Form State
  const [customerMode, setCustomerMode] = useState('existing'); // 'existing' | 'new'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState([
    { productId: '', itemName: '', quantity: 1, rate: 1000, discountPercent: 0, taxRate: 18, isTaxInclusive: true }
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [notes, setNotes] = useState('Quotation valid for 15 days from issue date. Subject to stock availability.');
  const [terms, setTerms] = useState('1. 100% advance against proforma invoice. 2. Standard manufacturer warranty applies.');

  const fetchEstimates = async () => {
    setLoading(true);
    const res = await adminApi.getEstimates({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search
    });
    if (res.data?.estimates) setEstimates(res.data.estimates);
    setLoading(false);
  };

  useEffect(() => {
    fetchEstimates();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEstimates();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Load catalog & customers for picker
  useEffect(() => {
    adminApi.getProducts({ limit: 100 }).then(res => {
      if (res.data?.products) setCatalogProducts(res.data.products);
    }).catch(() => {});

    adminApi.getCustomers().then(res => {
      if (res.data?.customers) setCustomers(res.data.customers);
    }).catch(() => {});
  }, []);

  // Line item calculation helper
  const calcRowTotal = (row) => {
    const gross = (Number(row.rate) || 0) * (Number(row.quantity) || 1);
    const disc = Math.round((gross * (Number(row.discountPercent) || 0)) / 100);
    const base = Math.max(0, gross - disc);
    if (row.isTaxInclusive) {
      return base;
    } else {
      const tax = Math.round((base * (Number(row.taxRate) || 18)) / 100);
      return base + tax;
    }
  };

  const docSubtotal = lineItems.reduce((acc, row) => acc + calcRowTotal(row), 0);
  const docTotal = Math.max(0, docSubtotal - Number(discountAmount) + Number(shippingAmount));

  // Convert Estimate to Invoice
  const handleConvertToInvoice = async (id) => {
    if (!window.confirm('Convert this estimate into a formal tax invoice? This will assign a sequential invoice number and deduct item inventory.')) {
      return;
    }

    const res = await adminApi.convertEstimateToInvoice(id);
    if (res.data?.invoiceNumber) {
      addToast({ type: 'success', message: `Converted to Tax Invoice ${res.data.invoiceNumber}!` });
      fetchEstimates();
      if (onNavigate) onNavigate('invoices');
    }
  };

  // Submit Estimate Builder
  const handleSaveEstimate = async (e) => {
    e.preventDefault();
    let name = customerName;
    let email = customerEmail;
    let phone = customerPhone;

    if (customerMode === 'existing' && selectedCustomerId) {
      const found = customers.find(c => String(c.id) === String(selectedCustomerId));
      if (found) {
        name = found.name;
        email = found.email;
        phone = found.phone;
      }
    }

    if (!name.trim()) {
      addToast({ type: 'error', message: 'Customer name is required' });
      return;
    }

    const formattedItems = lineItems.map(row => ({
      product_id: row.productId || null,
      item_name: row.itemName || 'Product Line Item',
      quantity: Number(row.quantity),
      rate: Number(row.rate),
      discountPercent: Number(row.discountPercent) || 0,
      taxRate: Number(row.taxRate) || 18,
      isTaxInclusive: row.isTaxInclusive
    }));

    setSavingEstimate(true);
    const res = await adminApi.createEstimate({
      customer: {
        id: selectedCustomerId || null,
        name,
        email,
        phone
      },
      items: formattedItems,
      estimateDate,
      validUntil,
      discountAmount: Number(discountAmount),
      shippingAmount: Number(shippingAmount),
      notes,
      terms
    });
    setSavingEstimate(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: `Quotation ${res.data?.estimateNumber} generated!` });
      setIsBuilderOpen(false);
      fetchEstimates();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Estimates & Quotations Engine
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Create professional commercial price quotes, download vector A4 PDFs, and convert to invoices in 1 click
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-[#EAEAEA] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['all', 'Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-mono uppercase border ${
                statusFilter === st
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white text-[#6B6B6B] border-[#EAEAEA] hover:border-[#0A0A0A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="Search quotation #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none w-64"
          />
        </div>
      </div>

      {/* Estimates Table */}
      <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
              <th className="p-3">Quote #</th>
              <th className="p-3">Issue Date</th>
              <th className="p-3">Valid Until</th>
              <th className="p-3">Customer</th>
              <th className="p-3 text-right">Quote Value</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {loading && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                  Loading quotations...
                </td>
              </tr>
            )}

            {!loading && estimates.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-xs text-[#6B6B6B]">
                  No estimates found.
                </td>
              </tr>
            )}

            {!loading && estimates.map(est => (
              <tr key={est.id} className="hover:bg-[#FBFBFB]">
                <td className="p-3 font-mono font-bold text-[#0A0A0A]">
                  {est.estimate_number}
                </td>

                <td className="p-3 font-mono text-[#6B6B6B] text-[11px]">
                  {est.estimate_date}
                </td>

                <td className="p-3 font-mono text-[#6B6B6B] text-[11px]">
                  {est.valid_until}
                </td>

                <td className="p-3">
                  <div className="font-semibold text-[#0A0A0A]">{est.customer_name}</div>
                  <div className="text-[11px] font-mono text-[#6B6B6B]">{est.customer_email || '—'}</div>
                </td>

                <td className="p-3 text-right font-mono font-bold text-sm text-[#0A0A0A]">
                  {formatINR(est.total)}
                </td>

                <td className="p-3 text-center font-mono">
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold ${
                    est.status === 'Accepted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : est.status === 'Sent'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-[#0A0A0A]'
                  }`}>
                    {est.status}
                  </span>
                </td>

                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={adminApi.getEstimatePdfUrl(est.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 text-xs font-mono uppercase border border-[#EAEAEA] hover:border-[#0A0A0A] flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </a>

                    {est.status !== 'Accepted' && (
                      <button
                        onClick={() => handleConvertToInvoice(est.id)}
                        className="px-2.5 py-1 text-xs font-mono uppercase bg-[#0A0A0A] text-white hover:bg-[#FF4D00] flex items-center gap-1 transition-colors"
                      >
                        Convert <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* ESTIMATE BUILDER MODAL */}
      {/* ======================================================== */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white border border-[#0A0A0A] p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-base uppercase tracking-wider font-bold text-[#0A0A0A]">
                  Commercial Price Quotation Builder
                </h3>
                <p className="text-xs text-[#6B6B6B]">Sequential numbering EST-xxxx will be generated automatically</p>
              </div>
              <button onClick={() => setIsBuilderOpen(false)} className="p-1">
                <X className="w-5 h-5 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleSaveEstimate} className="space-y-6">
              {/* Customer Selector */}
              <div className="p-4 bg-gray-50 border border-[#EAEAEA] space-y-4">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="custMode"
                      checked={customerMode === 'existing'}
                      onChange={() => setCustomerMode('existing')}
                      className="accent-[#FF4D00]"
                    />
                    Select Existing Customer
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="custMode"
                      checked={customerMode === 'new'}
                      onChange={() => setCustomerMode('new')}
                      className="accent-[#FF4D00]"
                    />
                    New Client
                  </label>
                </div>

                {customerMode === 'existing' ? (
                  <div>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#CCC] text-xs bg-white font-mono"
                    >
                      <option value="">Select Customer from CRM...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email} • {c.phone || 'No phone'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Customer Name *"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="px-3 py-1.5 border border-[#CCC] text-xs bg-white"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="px-3 py-1.5 border border-[#CCC] text-xs font-mono bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="px-3 py-1.5 border border-[#CCC] text-xs font-mono bg-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Quotation Date</label>
                    <input
                      type="date"
                      value={estimateDate}
                      onChange={(e) => setEstimateDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Valid Until Date</label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A]">
                    Quotation Line Items
                  </div>
                  <button
                    type="button"
                    onClick={() => setLineItems([...lineItems, { productId: '', itemName: '', quantity: 1, rate: 1000, discountPercent: 0, taxRate: 18, isTaxInclusive: true }])}
                    className="text-xs font-mono text-[#FF4D00] hover:underline"
                  >
                    + Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((row, idx) => (
                    <div key={idx} className="p-3 border border-[#EAEAEA] bg-white flex flex-wrap items-center gap-2 text-xs">
                      {/* Product Selector */}
                      <select
                        value={row.productId}
                        onChange={(e) => {
                          const prodId = e.target.value;
                          const found = catalogProducts.find(p => p.id === prodId);
                          const updated = [...lineItems];
                          updated[idx].productId = prodId;
                          if (found) {
                            updated[idx].itemName = found.name;
                            updated[idx].rate = found.price;
                            updated[idx].taxRate = found.gstRate || 18;
                            updated[idx].isTaxInclusive = found.isTaxInclusive !== false;
                          }
                          setLineItems(updated);
                        }}
                        className="w-56 px-2 py-1.5 border border-[#CCC] text-xs font-mono bg-white"
                      >
                        <option value="">Catalog Item...</option>
                        {catalogProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                        ))}
                      </select>

                      {/* Custom Title */}
                      <input
                        type="text"
                        placeholder="Item Title"
                        value={row.itemName}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[idx].itemName = e.target.value;
                          setLineItems(updated);
                        }}
                        className="flex-1 min-w-[140px] px-2 py-1.5 border border-[#CCC] text-xs"
                      />

                      {/* Qty */}
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[idx].quantity = Number(e.target.value);
                          setLineItems(updated);
                        }}
                        className="w-16 px-2 py-1.5 border border-[#CCC] text-xs font-mono text-center"
                      />

                      {/* Rate */}
                      <input
                        type="number"
                        min="1"
                        placeholder="Rate ₹"
                        value={row.rate}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[idx].rate = Number(e.target.value);
                          setLineItems(updated);
                        }}
                        className="w-24 px-2 py-1.5 border border-[#CCC] text-xs font-mono text-right"
                      />

                      {/* Disc % */}
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Disc %"
                        value={row.discountPercent}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[idx].discountPercent = Number(e.target.value);
                          setLineItems(updated);
                        }}
                        className="w-16 px-2 py-1.5 border border-[#CCC] text-xs font-mono text-center"
                      />

                      {/* Line Total */}
                      <div className="w-24 text-right font-mono font-bold">
                        {formatINR(calcRowTotal(row))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-4 bg-gray-50 border border-[#EAEAEA] font-mono text-xs space-y-2 text-right">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Subtotal:</span>
                  <span>{formatINR(docSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B]">Overall Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-28 px-2 py-1 border border-[#CCC] text-right font-mono bg-white"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B]">Shipping / Freight (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={shippingAmount}
                    onChange={(e) => setShippingAmount(e.target.value)}
                    className="w-28 px-2 py-1 border border-[#CCC] text-right font-mono bg-white"
                  />
                </div>
                <div className="flex justify-between text-base font-bold text-[#0A0A0A] pt-2 border-t border-[#CCC]">
                  <span>Total Quote Amount:</span>
                  <span>{formatINR(docTotal)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 border border-[#EAEAEA] text-xs font-mono uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEstimate}
                  className="px-6 py-2 bg-[#0A0A0A] text-white text-xs font-mono uppercase hover:bg-[#FF4D00] transition-colors font-semibold"
                >
                  {savingEstimate ? 'Generating...' : 'Save & Issue Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
