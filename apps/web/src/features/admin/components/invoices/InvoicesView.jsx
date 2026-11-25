// src/components/admin/InvoicesView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Download
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import { formatINR } from '@shared/utils/formatters';
import useToastStore from '@shared/store/toastStore';
import InvoiceDetailDrawer from '@features/admin/components/invoices/InvoiceDetailDrawer';
import InvoiceModals from '@features/admin/components/invoices/InvoiceModals';

export default function InvoicesView() {
  const addToast = useToastStore((s) => s.addToast);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all'); // 'all', 'retail', 'wholesale'

  // Detail & Action Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [_loadingDetail, setLoadingDetail] = useState(false);

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
  const [paymentTerms, _setPaymentTerms] = useState('Due on receipt');
  const [templateChoice, setTemplateChoice] = useState('standard');
  const [lineItems, setLineItems] = useState([
    { productId: '', itemName: '', quantity: 1, rate: 1000, discountPercent: 0, taxRate: 18, isTaxInclusive: true }
  ]);
  const [docDiscount, _setDocDiscount] = useState(0);
  const [docShipping, _setDocShipping] = useState(0);
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
            className="px-3 py-1.5 bg-[#0A0A0A] text-accent-contrast text-xs font-mono uppercase tracking-wider hover:bg-accent flex items-center gap-1.5 transition-colors font-semibold"
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
                    <span className="px-1.5 py-0.5 rounded font-bold uppercase bg-accent-tint text-accent-text border border-accent-border">
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
                  <span className={inv.balance_due > 0 ? 'text-accent-text' : 'text-emerald-700'}>
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
                      className="px-2.5 py-1 text-xs font-mono uppercase bg-[#0A0A0A] text-accent-contrast hover:bg-accent transition-colors"
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

      <InvoiceDetailDrawer
        selectedInvoice={selectedInvoice}
        setSelectedInvoice={setSelectedInvoice}
        setPaymentAmount={setPaymentAmount}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        setIsVoidModalOpen={setIsVoidModalOpen}
      />

      <InvoiceModals
        selectedInvoice={selectedInvoice}
        isPaymentModalOpen={isPaymentModalOpen}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        handlePaymentSubmit={handlePaymentSubmit}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentRef={paymentRef}
        setPaymentRef={setPaymentRef}
        paymentDate={paymentDate}
        setPaymentDate={setPaymentDate}
        submittingPayment={submittingPayment}
        isVoidModalOpen={isVoidModalOpen}
        setIsVoidModalOpen={setIsVoidModalOpen}
        handleVoidSubmit={handleVoidSubmit}
        voidReason={voidReason}
        setVoidReason={setVoidReason}
        submittingVoid={submittingVoid}
        isCreatorOpen={isCreatorOpen}
        setIsCreatorOpen={setIsCreatorOpen}
        handleCreateInvoice={handleCreateInvoice}
        customerMode={customerMode}
        setCustomerMode={setCustomerMode}
        selectedCustomerId={selectedCustomerId}
        setSelectedCustomerId={setSelectedCustomerId}
        customers={customers}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerGstin={customerGstin}
        setCustomerGstin={setCustomerGstin}
        placeOfSupply={placeOfSupply}
        setPlaceOfSupply={setPlaceOfSupply}
        invoiceDate={invoiceDate}
        setInvoiceDate={setInvoiceDate}
        dueDate={dueDate}
        setDueDate={setDueDate}
        lineItems={lineItems}
        setLineItems={setLineItems}
        catalogProducts={catalogProducts}
        templateChoice={templateChoice}
        setTemplateChoice={setTemplateChoice}
        savingInvoice={savingInvoice}
      />
    </div>
  );
}
