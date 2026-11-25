// src/components/admin/InvoicesView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  AlertTriangle, 
  X, 
  Ban
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { formatINR } from '../../utils/formatters';
import useToastStore from '../../store/toastStore';

export default function InvoicesView() {
  const addToast = useToastStore((s) => s.addToast);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all'); // 'all', 'retail', 'wholesale'

  // Detail & Action Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Void Invoice Modal State
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [submittingVoid, setSubmittingVoid] = useState(false);

  // New Invoice Creator State
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Karnataka (29)');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('Due on receipt');
  const [templateChoice, setTemplateChoice] = useState('standard');
  const [lineItems, setLineItems] = useState([
    { productId: '', itemName: '', quantity: 1, rate: 1000, discountPercent: 0, taxRate: 18, isTaxInclusive: true }
  ]);
  const [docDiscount, setDocDiscount] = useState(0);
  const [docShipping, setDocShipping] = useState(0);
  const [savingInvoice, setSavingInvoice] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    const res = await adminApi.getInvoices({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      channel: channelFilter !== 'all' ? channelFilter : undefined,
      search
    });
    if (res.data?.invoices) setInvoices(res.data.invoices);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    adminApi.getProducts({ limit: 120 }).then(res => {
      if (res.data?.products) setCatalogProducts(res.data.products);
    }).catch(() => {});

    adminApi.getCustomers().then(res => {
      if (res.data?.customers) setCustomers(res.data.customers);
    }).catch(() => {});
  }, []);

  const openInvoiceDetail = async (id) => {
    setLoadingDetail(true);
    const res = await adminApi.getInvoice(id);
    setLoadingDetail(false);
    if (res.data?.invoice) {
      setSelectedInvoice(res.data.invoice);
    }
  };

  // Record Payment Submit
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount) return;

    setSubmittingPayment(true);
    const res = await adminApi.recordPayment(selectedInvoice.id, {
      amount: Number(paymentAmount),
      paymentMethod,
      referenceNumber: paymentRef,
      paymentDate
    });
    setSubmittingPayment(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: `Payment of ${formatINR(Number(paymentAmount))} recorded successfully.` });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      openInvoiceDetail(selectedInvoice.id);
      fetchInvoices();
    }
  };

  // Void Invoice Submit
  const handleVoidSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !voidReason) return;

    setSubmittingVoid(true);
    const res = await adminApi.voidInvoice(selectedInvoice.id, { voidReason });
    setSubmittingVoid(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'info', message: 'Invoice voided and inventory restored.' });
      setIsVoidModalOpen(false);
      setVoidReason('');
      openInvoiceDetail(selectedInvoice.id);
      fetchInvoices();
    }
  };

  // Create Invoice Submit
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    let name = customerName;
    let email = customerEmail;
    let phone = customerPhone;
    let gstin = customerGstin;

    if (customerMode === 'existing' && selectedCustomerId) {
      const found = customers.find(c => String(c.id) === String(selectedCustomerId));
      if (found) {
        name = found.name;
        email = found.email;
        phone = found.phone;
        gstin = found.gstin || '';
      }
    }

    if (!name.trim()) {
      addToast({ type: 'error', message: 'Customer name is required' });
      return;
    }

    const formattedItems = lineItems.map(row => ({
      product_id: row.productId || null,
      item_name: row.itemName || 'Line Item',
      quantity: Number(row.quantity),
      rate: Number(row.rate),
      discountPercent: Number(row.discountPercent) || 0,
      taxRate: Number(row.taxRate) || 18,
      isTaxInclusive: row.isTaxInclusive
    }));

    setSavingInvoice(true);
    const res = await adminApi.createInvoice({
      customer: {
        id: selectedCustomerId || null,
        name,
        email,
        phone,
        gstin
      },
      items: formattedItems,
      invoiceDate,
      dueDate,
      paymentTerms,
      placeOfSupply,
      discountAmount: Number(docDiscount),
      shippingAmount: Number(docShipping),
      template: templateChoice
    });
    setSavingInvoice(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: `Tax Invoice ${res.data?.invoiceNumber} generated!` });
      setIsCreatorOpen(false);
      fetchInvoices();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Invoicing & Tax Billing (GST)
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Compliant Indian GST Tax Invoices (INV-2026-xxxx), payment tracking, balance due, and vector A4 PDF generation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatorOpen(true)}
            className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Tax Invoice
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 bg-white border border-[#EAEAEA] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'Unpaid', 'Partially paid', 'Paid', 'Overdue', 'Void'].map(st => (
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

          {/* Channel Selector */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#EAEAEA] text-xs font-mono bg-white outline-none ml-2"
          >
            <option value="all">All Invoices</option>
            <option value="retail">Retail B2C Invoices</option>
            <option value="wholesale">Wholesale B2B (GST)</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="Search invoice #, customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none w-64"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
              <th className="p-3">Invoice #</th>
              <th className="p-3">Channel</th>
              <th className="p-3">Invoice Date</th>
              <th className="p-3">Due Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3 text-right">Total (₹)</th>
              <th className="p-3 text-right">Balance Due</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {loading && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                  Loading invoices...
                </td>
              </tr>
            )}

            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-xs text-[#6B6B6B]">
                  No invoices found.
                </td>
              </tr>
            )}

            {!loading && invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-[#FBFBFB]">
                <td className="p-3 font-mono font-bold text-[#0A0A0A]">
                  {inv.invoice_number}
                </td>

                <td className="p-3 font-mono text-[10px]">
                  {inv.channel === 'wholesale' || inv.invoice_type === 'gst' ? (
                    <span className="px-1.5 py-0.5 rounded font-bold uppercase bg-[#FFF0EB] text-[#FF4D00] border border-[#FFD9CC]">
                      B2B GST
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded font-medium uppercase bg-neutral-100 text-[#6B6B6B]">
                      Retail
                    </span>
                  )}
                </td>

                <td className="p-3 font-mono text-[#6B6B6B] text-[11px]">
                  {inv.invoice_date}
                </td>

                <td className="p-3 font-mono text-[#6B6B6B] text-[11px]">
                  {inv.due_date}
                </td>

                <td className="p-3">
                  <div className="font-semibold text-[#0A0A0A]">{inv.customer_name}</div>
                  <div className="text-[11px] font-mono text-[#6B6B6B]">{inv.customer_gstin ? `GSTIN: ${inv.customer_gstin}` : (inv.customer_email || '—')}</div>
                </td>

                <td className="p-3 text-right font-mono font-bold text-sm text-[#0A0A0A]">
                  {formatINR(inv.total)}
                </td>

                <td className="p-3 text-right font-mono font-bold">
                  <span className={inv.balance_due > 0 ? 'text-[#FF4D00]' : 'text-emerald-700'}>
                    {formatINR(inv.balance_due)}
                  </span>
                </td>

                <td className="p-3 text-center font-mono">
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold ${
                    inv.status === 'Paid' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : inv.status === 'Partially paid'
                      ? 'bg-amber-100 text-amber-800'
                      : inv.status === 'Void'
                      ? 'bg-red-100 text-red-700 line-through'
                      : 'bg-black text-white'
                  }`}>
                    {inv.status}
                  </span>
                </td>

                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={adminApi.getInvoicePdfUrl(inv.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 border border-[#EAEAEA] hover:border-[#0A0A0A] text-xs font-mono uppercase flex items-center gap-1"
                      title="Download PDF"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </a>

                    <button
                      onClick={() => openInvoiceDetail(inv.id)}
                      className="px-2.5 py-1 text-xs font-mono uppercase bg-[#0A0A0A] text-white hover:bg-[#FF4D00] transition-colors"
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* INVOICE DETAIL & PAYMENT DRAWER */}
      {/* ======================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-150">
            {/* Header */}
            <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-[#0A0A0A]">
                    {selectedInvoice.invoice_number}
                  </h2>
                  <span className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold ${
                    selectedInvoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-black text-white'
                  }`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">
                  Issued: {selectedInvoice.invoice_date} • Due: {selectedInvoice.due_date}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={adminApi.getInvoicePdfUrl(selectedInvoice.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 border border-[#EAEAEA] hover:border-[#0A0A0A] text-xs font-mono uppercase flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </a>

                {selectedInvoice.status !== 'Paid' && selectedInvoice.status !== 'Void' && (
                  <button
                    onClick={() => {
                      setPaymentAmount(selectedInvoice.balance_due);
                      setIsPaymentModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#FF4D00] text-black text-xs font-mono uppercase font-bold hover:bg-[#0A0A0A] hover:text-white transition-colors"
                  >
                    + Record Payment
                  </button>
                )}

                {selectedInvoice.status !== 'Void' && (
                  <button
                    onClick={() => setIsVoidModalOpen(true)}
                    className="p-1.5 text-neutral-400 hover:text-red-600"
                    title="Void Invoice"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}

                <button onClick={() => setSelectedInvoice(null)} className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Box */}
              <div className="p-4 bg-gray-50 border border-[#EAEAEA] grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase">Billed To</div>
                  <div className="font-bold text-sm text-[#0A0A0A] mt-0.5">{selectedInvoice.customer_name}</div>
                  <div className="text-[#6B6B6B] mt-1">{selectedInvoice.customer_email}</div>
                  {selectedInvoice.customer_phone && <div className="text-[#6B6B6B]">{selectedInvoice.customer_phone}</div>}
                  {selectedInvoice.customer_gstin && <div className="text-[#0A0A0A] font-bold mt-1">GSTIN: {selectedInvoice.customer_gstin}</div>}
                </div>

                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase">Tax Information</div>
                  <div className="mt-1">Place of Supply: <strong className="text-[#0A0A0A]">{selectedInvoice.place_of_supply}</strong></div>
                  <div>Payment Terms: <strong className="text-[#0A0A0A]">{selectedInvoice.payment_terms}</strong></div>
                  <div>Template Style: <span className="uppercase text-[#FF4D00] font-bold">{selectedInvoice.template || 'standard'}</span></div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-[#EAEAEA]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[10px]">
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-center">GST</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {(selectedInvoice.items || []).map((it, idx) => (
                      <tr key={idx} className="font-mono">
                        <td className="p-2.5 font-sans font-semibold text-[#0A0A0A]">{it.item_name}</td>
                        <td className="p-2.5 text-center">{it.quantity}</td>
                        <td className="p-2.5 text-right">{formatINR(it.rate)}</td>
                        <td className="p-2.5 text-center">{it.tax_rate || 18}%</td>
                        <td className="p-2.5 text-right font-bold">{formatINR(it.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tax Breakdown & Totals */}
                <div className="p-4 bg-gray-50 border-t border-[#EAEAEA] space-y-1.5 font-mono text-xs text-right">
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Subtotal:</span>
                    <span>{formatINR(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between text-[#FF4D00]">
                      <span>Discount:</span>
                      <span>-{formatINR(selectedInvoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Taxable Value:</span>
                    <span>{formatINR(selectedInvoice.taxable_value || selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.cgst_amount > 0 && (
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span>CGST (9%) + SGST (9%):</span>
                      <span>{formatINR(selectedInvoice.cgst_amount)} + {formatINR(selectedInvoice.sgst_amount)}</span>
                    </div>
                  )}
                  {selectedInvoice.igst_amount > 0 && (
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span>IGST (18%):</span>
                      <span>{formatINR(selectedInvoice.igst_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-[#0A0A0A] pt-2 border-t border-[#CCC]">
                    <span>Grand Total:</span>
                    <span>{formatINR(selectedInvoice.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6B6B6B]">
                    <span>Amount Paid:</span>
                    <span>{formatINR(selectedInvoice.amount_paid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#FF4D00]">
                    <span>Balance Due:</span>
                    <span>{formatINR(selectedInvoice.balance_due || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Amount in words */}
              {selectedInvoice.amount_in_words && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 text-xs font-mono text-amber-900">
                  <strong>In Words:</strong> {selectedInvoice.amount_in_words}
                </div>
              )}

              {/* Payments Ledger */}
              <div className="border border-[#EAEAEA]">
                <div className="p-3 bg-[#F7F7F7] font-mono text-xs uppercase font-bold text-[#0A0A0A]">
                  Recorded Payments ({selectedInvoice.payments?.length || 0})
                </div>
                <div className="divide-y divide-[#F0F0F0] font-mono text-xs">
                  {(selectedInvoice.payments || []).map((pay, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#0A0A0A]">{formatINR(pay.amount)}</div>
                        <div className="text-[11px] text-[#6B6B6B]">
                          {pay.payment_date} • Method: <span className="uppercase">{pay.payment_method}</span>
                          {pay.reference_number && ` • Ref: ${pay.reference_number}`}
                        </div>
                      </div>
                      <span className="text-emerald-600 font-bold">✓ Cleared</span>
                    </div>
                  ))}

                  {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) && (
                    <div className="p-4 text-center text-[#999] text-xs">No payments recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RECORD PAYMENT MODAL */}
      {/* ======================================================== */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white border border-[#0A0A0A] p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  Record Payment
                </h3>
                <p className="text-[11px] text-[#6B6B6B]">Balance: {formatINR(selectedInvoice.balance_due)}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 font-mono">
              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedInvoice.balance_due}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs bg-white outline-none"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI Instant</option>
                  <option value="cash">Cash Received</option>
                  <option value="card">Card POS</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Reference / UTR / Transaction #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-982189283"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs bg-white outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2 border border-[#EAEAEA] text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white text-xs uppercase hover:bg-[#FF4D00] transition-colors font-bold"
                >
                  {submittingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VOID INVOICE MODAL */}
      {/* ======================================================== */}
      {isVoidModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white border border-red-600 p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 text-red-600 mb-3 font-mono text-xs uppercase font-bold">
              <AlertTriangle className="w-5 h-5" />
              Void Invoice & Restore Stock
            </div>

            <p className="text-xs text-[#333] mb-4 leading-relaxed">
              Voiding <strong>{selectedInvoice.invoice_number}</strong> will permanently cancel this invoice and automatically restore all deducted line items back to product stock.
            </p>

            <form onSubmit={handleVoidSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                  Mandatory Void Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Order cancelled by client, data entry error"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs outline-none font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(false)}
                  className="flex-1 py-2 border border-[#CCC] text-xs font-mono uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVoid}
                  className="flex-1 py-2 bg-red-600 text-white text-xs font-mono uppercase hover:bg-black transition-colors font-bold"
                >
                  {submittingVoid ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NEW TAX INVOICE CREATOR MODAL */}
      {/* ======================================================== */}
      {isCreatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white border border-[#0A0A0A] p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-base uppercase tracking-wider font-bold text-[#0A0A0A]">
                  Generate GST Tax Invoice
                </h3>
                <p className="text-xs text-[#6B6B6B]">Generates sequential INV-2026-xxxx and auto-deducts inventory</p>
              </div>
              <button onClick={() => setIsCreatorOpen(false)} className="p-1">
                <X className="w-5 h-5 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-6">
              {/* Customer Box */}
              <div className="p-4 bg-gray-50 border border-[#EAEAEA] space-y-4">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="invCustMode"
                      checked={customerMode === 'existing'}
                      onChange={() => setCustomerMode('existing')}
                      className="accent-[#FF4D00]"
                    />
                    Select Existing Client
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="invCustMode"
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
                          {c.name} ({c.email} • {c.phone || 'No phone'} {c.gstin ? `• GSTIN: ${c.gstin}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                    <input
                      type="text"
                      placeholder="GSTIN (Optional)"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value)}
                      className="px-3 py-1.5 border border-[#CCC] text-xs font-mono bg-white uppercase"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Place of Supply</label>
                    <select
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono bg-white"
                    >
                      <option value="Karnataka (29)">Karnataka (29) - Intra-state CGST+SGST</option>
                      <option value="Maharashtra (27)">Maharashtra (27) - Inter-state IGST</option>
                      <option value="Delhi (07)">Delhi (07) - Inter-state IGST</option>
                      <option value="Tamil Nadu (33)">Tamil Nadu (33) - Inter-state IGST</option>
                      <option value="Haryana (06)">Haryana (06) - Inter-state IGST</option>
                      <option value="Telangana (36)">Telangana (36) - Inter-state IGST</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A]">
                    Invoice Line Items
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
                          <option key={p.id} value={p.id}>{p.name} (₹{p.price} • Stock: {p.stock})</option>
                        ))}
                      </select>

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

              {/* Template Choice */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-[#6B6B6B]">PDF Template:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tmpl"
                    checked={templateChoice === 'standard'}
                    onChange={() => setTemplateChoice('standard')}
                    className="accent-[#FF4D00]"
                  />
                  Standard Layout (Full Header)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tmpl"
                    checked={templateChoice === 'compact'}
                    onChange={() => setTemplateChoice('compact')}
                    className="accent-[#FF4D00]"
                  />
                  Compact Layout (Dense 1-Page)
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatorOpen(false)}
                  className="px-4 py-2 border border-[#EAEAEA] text-xs font-mono uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  className="px-6 py-2 bg-[#0A0A0A] text-white text-xs font-mono uppercase hover:bg-[#FF4D00] transition-colors font-semibold"
                >
                  {savingInvoice ? 'Generating Invoice...' : 'Generate & Save Tax Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
