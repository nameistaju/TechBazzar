import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { formatINR } from '@shared/utils/formatters';

export default function InvoiceModals({
  selectedInvoice,
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  handlePaymentSubmit,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentRef,
  setPaymentRef,
  paymentDate,
  setPaymentDate,
  submittingPayment,
  isVoidModalOpen,
  setIsVoidModalOpen,
  handleVoidSubmit,
  voidReason,
  setVoidReason,
  submittingVoid,
  isCreatorOpen,
  setIsCreatorOpen,
  handleCreateInvoice,
  customerMode,
  setCustomerMode,
  selectedCustomerId,
  setSelectedCustomerId,
  customers,
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  customerPhone,
  setCustomerPhone,
  customerGstin,
  setCustomerGstin,
  placeOfSupply,
  setPlaceOfSupply,
  invoiceDate,
  setInvoiceDate,
  dueDate,
  setDueDate,
  lineItems,
  setLineItems,
  catalogProducts,
  templateChoice,
  setTemplateChoice,
  savingInvoice,
}) {
  return (
    <>
      {/* RECORD PAYMENT MODAL */}
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
                  className="flex-1 py-2 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs uppercase hover:bg-accent transition-colors font-bold"
                >
                  {submittingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID INVOICE MODAL */}
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

      {/* NEW TAX INVOICE CREATOR MODAL */}
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
                      className="accent-accent"
                    />
                    Select Existing Client
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="invCustMode"
                      checked={customerMode === 'new'}
                      onChange={() => setCustomerMode('new')}
                      className="accent-accent"
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
                    className="text-xs font-mono text-accent-text hover:underline"
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
                    className="accent-accent"
                  />
                  Standard Layout (Full Header)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tmpl"
                    checked={templateChoice === 'compact'}
                    onChange={() => setTemplateChoice('compact')}
                    className="accent-accent"
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
                  className="px-6 py-2 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase hover:bg-accent transition-colors font-semibold"
                >
                  {savingInvoice ? 'Generating Invoice...' : 'Generate & Save Tax Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
