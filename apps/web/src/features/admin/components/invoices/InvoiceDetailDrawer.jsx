import React from 'react';
import { Download, Ban, X } from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import { formatINR } from '@shared/utils/formatters';

export default function InvoiceDetailDrawer({
  selectedInvoice,
  setSelectedInvoice,
  setPaymentAmount,
  setIsPaymentModalOpen,
  setIsVoidModalOpen,
}) {
  if (!selectedInvoice) return null;

  return (
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
                className="px-3 py-1.5 bg-accent text-black text-xs font-mono uppercase font-bold hover:bg-[#0A0A0A] hover:text-accent-contrast transition-colors"
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
              <div>Template Style: <span className="uppercase text-accent-text font-bold">{selectedInvoice.template || 'standard'}</span></div>
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
                <div className="flex justify-between text-accent-text">
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
              <div className="flex justify-between text-sm font-bold text-accent-text">
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
  );
}
