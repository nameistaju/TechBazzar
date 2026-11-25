import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Send, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Printer, 
  ShieldCheck
} from 'lucide-react';
import Breadcrumbs from '@shared/ui/Breadcrumbs';
import { useStore } from '@app/providers/StoreContext';
import productsApi from '@shared/api/productsApi';

export default function QuoteRequestPage() {
  const [searchParams] = useSearchParams();
  const { cart, showToast } = useStore();

  const [activeTab, setActiveTab] = useState('new'); // 'new', 'track'

  // Pre-fill item from cart or sample
  const [items, setItems] = useState(() => {
    if (cart.length > 0) {
      return cart.map((it, idx) => ({
        id: idx + 1,
        productId: it.id,
        name: it.name,
        quantity: it.quantity,
        targetPrice: it.price
      }));
    }

    return [
      { id: 1, productId: '', name: 'High-Durability Braided USB-C Cables (Sample)', quantity: 100, targetPrice: 12000 }
    ];
  });

  React.useEffect(() => {
    const queryProdId = searchParams.get('productId');
    const queryQty = parseInt(searchParams.get('qty'), 10) || 50;
    if (!queryProdId) return;
    productsApi.getProductById(queryProdId).then((res) => {
      const p = res.data?.product;
      if (p) {
        setItems([{ id: 1, productId: p.id, name: p.name, quantity: queryQty, targetPrice: p.price }]);
      }
    });
  }, [searchParams]);

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [pincode, setPincode] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState(null);

  // Quote Tracking
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackContact, setTrackContact] = useState('');
  const [trackedQuote, setTrackedQuote] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: Date.now(), productId: '', name: '', quantity: 50, targetPrice: '' }
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleItemChange = (id, field, val) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: val } : it));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !email.trim() || !phone.trim()) {
      showToast('Please provide your contact name, email, and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          contactName,
          email,
          phone,
          gstin,
          pincode,
          targetPrice: targetPrice ? Number(targetPrice) : null,
          notes,
          items: items.filter(it => it.name.trim())
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to submit quote request');
      }

      setSubmittedQuote({
        quoteNumber: json.data.quoteNumber,
        contactName,
        email,
        businessName,
        createdAt: new Date().toISOString()
      });
      showToast(`Wholesale RFQ ${json.data.quoteNumber} submitted successfully!`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackQuote = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    setTrackingLoading(true);
    setTrackError('');
    setTrackedQuote(null);

    try {
      const qs = trackContact.trim() ? `?contact=${encodeURIComponent(trackContact.trim())}` : '';
      const res = await fetch(`/api/quotes/${encodeURIComponent(trackingNumber.trim())}${qs}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Quote request not found');
      }
      setTrackedQuote(json.data);
    } catch (err) {
      setTrackError(err.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Request a Quote' }]} />

        {/* Header */}
        <div className="py-6 border-b border-[#EAEAEA] mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#FF4D00] font-bold block mb-1">
              Custom B2B Quotations
            </span>
            <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-wider text-[#0A0A0A]">
              Request a Wholesale Quote
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-1.5 max-w-xl">
              Placing a 100+ unit order or need specific tender pricing? Get custom factory rates within 4 business hours.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'new'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'border border-[#EAEAEA] text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              New RFQ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('track')}
              className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'track'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'border border-[#EAEAEA] text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              Check Status
            </button>
          </div>
        </div>

        {/* Tab 1: New Quote Form / Confirmation */}
        {activeTab === 'new' && (
          <div>
            {submittedQuote ? (
              /* Success Confirmation */
              <div className="max-w-2xl mx-auto p-8 border border-[#EAEAEA] rounded-[4px] bg-[#FAFAFA] text-center space-y-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#FF4D00]">
                    Quote Request Received
                  </span>
                  <h2 className="text-2xl font-light text-[#0A0A0A] uppercase tracking-wide mt-1">
                    Reference: {submittedQuote.quoteNumber}
                  </h2>
                  <p className="text-xs text-[#6B6B6B] mt-2 max-w-md mx-auto leading-relaxed">
                    Thank you, <strong className="text-[#0A0A0A]">{submittedQuote.contactName}</strong>. Our dedicated B2B sales team has logged your quotation request. A computerized quotation with volume price breaks will be emailed to <strong className="text-[#0A0A0A]">{submittedQuote.email}</strong> within 4 business hours.
                  </p>
                </div>

                <div className="p-4 bg-white rounded border border-[#EAEAEA] text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Quote ID:</span>
                    <span className="font-mono font-bold text-[#0A0A0A]">{submittedQuote.quoteNumber}</span>
                  </div>
                  {submittedQuote.businessName && (
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Business:</span>
                      <span className="font-medium text-[#0A0A0A]">{submittedQuote.businessName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Submitted On:</span>
                    <span className="text-[#0A0A0A]">{new Date(submittedQuote.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-6 py-2.5 rounded border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                  >
                    <Printer size={13} /> Print RFQ Slip
                  </button>
                  <Link
                    to="/shop"
                    className="px-6 py-2.5 rounded bg-[#FF4D00] text-white hover:bg-[#E04400] text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    Return to Catalogue
                  </Link>
                </div>
              </div>
            ) : (
              /* RFQ Submission Form */
              <form onSubmit={handleSubmit} className="space-y-10">
                {/* 1. Products / Line Items to Quote */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#0A0A0A]">
                      1. Hardware & Quantity Requirements
                    </h2>
                    <span className="text-[11px] text-[#6B6B6B]">Add all products you wish to procure</span>
                  </div>

                  <div className="border border-[#EAEAEA] rounded-[4px] overflow-hidden bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] text-[#6B6B6B] uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Product Name / Model / Description</th>
                          <th className="py-2.5 px-3 w-32">Desired Units</th>
                          <th className="py-2.5 px-3 w-40">Target Rate (₹/unit)</th>
                          <th className="py-2.5 px-3 w-12 text-center">Del</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2F2F2]">
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="e.g. boAt Bassheads 100 Wired Earphones (Black)"
                                value={it.name}
                                onChange={(e) => handleItemChange(it.id, 'name', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-[#EAEAEA] rounded text-xs outline-none focus:border-[#0A0A0A]"
                                required
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="1"
                                placeholder="50"
                                value={it.quantity}
                                onChange={(e) => handleItemChange(it.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-full px-2.5 py-1.5 border border-[#EAEAEA] rounded text-xs tabular-nums outline-none focus:border-[#0A0A0A]"
                                required
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-[#8A8A8A]">₹</span>
                                <input
                                  type="number"
                                  placeholder="Expected rate"
                                  value={it.targetPrice || ''}
                                  onChange={(e) => handleItemChange(it.id, 'targetPrice', e.target.value)}
                                  className="w-full pl-6 pr-2.5 py-1.5 border border-[#EAEAEA] rounded text-xs tabular-nums outline-none focus:border-[#0A0A0A]"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                disabled={items.length <= 1}
                                className="text-[#BDBDBD] hover:text-red-500 disabled:opacity-20 p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-dashed border-[#BDBDBD] hover:border-[#0A0A0A] text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] transition-colors"
                  >
                    <Plus size={13} /> Add Another Product
                  </button>
                </div>

                {/* 2. Business & Contact Information */}
                <div className="space-y-4">
                  <div className="border-b border-[#EAEAEA] pb-2">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#0A0A0A]">
                      2. Commercial & Contact Information
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1 font-medium">
                        Business / Organization Name
                      </label>
                      <input
                        type="text"
                        placeholder="Apex Retailers LLP"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full px-3 py-2 border border-[#EAEAEA] rounded text-xs outline-none focus:border-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1 font-medium">
                        Contact Person Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Ramesh Patel"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full px-3 py-2 border border-[#EAEAEA] rounded text-xs outline-none focus:border-[#0A0A0A]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1 font-medium">
                        Business Email Address *
                      </label>
                      <input
                        type="email"
                        placeholder="ramesh@apexretail.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-[#EAEAEA] rounded text-xs outline-none focus:border-[#0A0A0A]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1 font-medium">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        placeholder="9845012345"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-[#EAEAEA] rounded text-xs outline-none focus:border-[#0A0A0A]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1 font-medium">
                        GSTIN (Optional for initial quotation)
                      </label>
                      <input
                        type="text"
                        placeholder="29ABCDE1234F1Z5"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-[#EAEAEA] rounded font-mono text-xs uppercase outline-none focus:border-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1 font-medium">
                        Delivery PIN Code
                      </label>
                      <input
                        type="text"
                        placeholder="560001"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="w-full px-3 py-2 border border-[#EAEAEA] rounded font-mono text-xs outline-none focus:border-[#0A0A0A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1 font-medium">
                      Special Requirements / Tenders / Delivery Schedule
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Specify packaging requirements, custom barcode labels, multi-location pallet drop, or recurring monthly delivery schedule."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 border border-[#EAEAEA] rounded text-xs outline-none focus:border-[#0A0A0A]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EAEAEA] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Official B2B quotation emailed within 4 hours. No obligation.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Send size={13} /> {submitting ? 'Submitting...' : 'Submit Request for Quote'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Track Existing Quote */}
        {activeTab === 'track' && (
          <div className="max-w-xl mx-auto space-y-6">
            <form onSubmit={handleTrackQuote} className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] block">
                Enter Quote Reference Number &amp; Registered Email or Phone
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g. RFQ-2026-0001"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-[#EAEAEA] rounded font-mono text-xs uppercase outline-none focus:border-[#0A0A0A]"
                  required
                />
                <input
                  type="text"
                  placeholder="Email or 10-digit phone"
                  value={trackContact}
                  onChange={(e) => setTrackContact(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-[#EAEAEA] rounded text-xs outline-none focus:border-[#0A0A0A]"
                  required
                />
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="bg-[#0A0A0A] text-white hover:bg-[#FF4D00] text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded transition-colors"
                >
                  {trackingLoading ? 'Searching...' : 'Track'}
                </button>
              </div>
            </form>

            {trackError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {trackError}
              </div>
            )}

            {trackedQuote && (
              <div className="p-6 border border-[#EAEAEA] rounded-[4px] bg-[#FAFAFA] space-y-4">
                <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Quote Ref</span>
                    <h3 className="font-mono font-bold text-base text-[#0A0A0A]">{trackedQuote.quote_number}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider ${
                    trackedQuote.status === 'Quoted' || trackedQuote.status === 'Accepted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {trackedQuote.status}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-[#6B6B6B]">
                  <div>Contact: <strong className="text-[#0A0A0A]">{trackedQuote.contact_name}</strong></div>
                  <div>Email: <strong className="text-[#0A0A0A]">{trackedQuote.email}</strong></div>
                  <div>Date Logged: <strong className="text-[#0A0A0A]">{new Date(trackedQuote.created_at).toLocaleDateString('en-IN')}</strong></div>
                </div>

                {/* Items */}
                <div className="pt-2">
                  <div className="text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold mb-2">Requested Items:</div>
                  <div className="divide-y divide-[#EAEAEA] border border-[#EAEAEA] rounded bg-white">
                    {(trackedQuote.items || []).map((it, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex justify-between items-center">
                        <span className="font-medium text-[#0A0A0A]">{it.name}</span>
                        <span className="tabular-nums font-semibold text-[#FF4D00]">{it.quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
