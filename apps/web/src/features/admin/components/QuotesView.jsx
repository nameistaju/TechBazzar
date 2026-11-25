// src/components/admin/QuotesView.jsx
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  FileSpreadsheet, 
  X, 
  Eye, 
  RefreshCw
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import useToastStore from '@shared/store/toastStore';

export default function QuotesView({ onNavigate }) {
  const addToast = useToastStore((s) => s.addToast);

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [convertingId, setConvertingId] = useState(null);

  const fetchQuotes = async () => {
    setLoading(true);
    const res = await adminApi.getQuotes({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: search || undefined
    });
    if (res.data?.quotes) {
      setQuotes(res.data.quotes);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter]);

  const handleUpdateStatus = async (quoteId, status) => {
    const res = await adminApi.updateQuote(quoteId, { status });
    if (!res.error) {
      setQuotes(quotes.map(q => q.id === quoteId ? { ...q, status } : q));
      if (selectedQuote?.id === quoteId) {
        setSelectedQuote(prev => ({ ...prev, status }));
      }
      addToast(`Quote status updated to "${status}"`, 'success');
    }
  };

  const handleConvertToEstimate = async (quote) => {
    setConvertingId(quote.id);
    const res = await adminApi.convertQuoteToEstimate(quote.id);
    setConvertingId(null);

    if (res.data?.estimate) {
      addToast(`Converted RFQ to official Estimate #${res.data.estimate.estimateNumber}`, 'success');
      if (onNavigate) {
        onNavigate('estimates');
      }
    } else {
      addToast(res.error || 'Conversion failed', 'error');
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#FF4D00]" />
            <h1 className="text-lg font-bold uppercase tracking-wider text-[#0A0A0A]">
              Wholesale RFQ Inquiries
            </h1>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Review custom bulk pricing requests, negotiate volume lots, and convert directly to Proforma Estimates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search RFQs by number or buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchQuotes()}
            className="px-3 py-1.5 border border-[#EAEAEA] bg-white rounded text-xs outline-none focus:border-[#0A0A0A] w-64"
          />
          <button
            onClick={fetchQuotes}
            className="p-2 border border-[#EAEAEA] hover:border-[#0A0A0A] bg-white rounded"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAEAEA] pb-2 text-[11px]">
        {['all', 'pending', 'reviewed', 'quoted', 'converted', 'declined'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded font-bold uppercase transition-colors ${
              statusFilter === st
                ? 'bg-[#0A0A0A] text-white'
                : 'text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F2F2F2]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAEAEA] rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] text-[#6B6B6B] uppercase text-[10px]">
                <th className="py-2.5 px-4 font-semibold">RFQ #</th>
                <th className="py-2.5 px-4 font-semibold">Buyer / Company</th>
                <th className="py-2.5 px-3 font-semibold">Contact</th>
                <th className="py-2.5 px-3 font-semibold text-center">Items</th>
                <th className="py-2.5 px-3 font-semibold text-right">Target Price</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F2]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8A8A8A]">
                    Loading RFQ inbox...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8A8A8A]">
                    No RFQ requests found for this filter.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => {
                  let parsedItems = [];
                  try {
                    parsedItems = JSON.parse(q.items || '[]');
                  } catch {}

                  return (
                    <tr key={q.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0A0A0A]">
                        {q.quote_number}
                        <span className="block text-[9px] text-[#8A8A8A] font-normal">
                          {q.created_at?.slice(0, 10)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0A0A0A]">{q.company || q.name}</div>
                        {q.gstin && (
                          <span className="text-[10px] text-[#6B6B6B] font-mono block">
                            GSTIN: {q.gstin}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-[#6B6B6B]">
                        <div>{q.email}</div>
                        <div>{q.phone}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="bg-[#F2F2F2] text-[#0A0A0A] px-2 py-0.5 rounded text-[10px] font-bold">
                          {parsedItems.length} products
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-[#0A0A0A]">
                        {q.target_price ? `₹${Number(q.target_price).toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          q.status === 'converted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'quoted'
                            ? 'bg-blue-100 text-blue-800'
                            : q.status === 'reviewed'
                            ? 'bg-amber-100 text-amber-800'
                            : q.status === 'declined'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {q.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedQuote(q)}
                            className="p-1 hover:text-[#0A0A0A] text-[#6B6B6B]"
                            title="View RFQ Details"
                          >
                            <Eye size={14} />
                          </button>

                          {q.status !== 'converted' && (
                            <button
                              type="button"
                              disabled={convertingId === q.id}
                              onClick={() => handleConvertToEstimate(q)}
                              className="px-2 py-1 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-[10px] uppercase font-bold rounded flex items-center gap-1 transition-colors"
                              title="Convert to Proforma Estimate"
                            >
                              <FileSpreadsheet size={11} /> Convert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div className="bg-white rounded-[4px] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <div>
                <h3 className="font-bold uppercase text-[#0A0A0A] text-sm">
                  RFQ Reference: {selectedQuote.quote_number}
                </h3>
                <span className="text-[10px] text-[#8A8A8A]">
                  Submitted on {selectedQuote.created_at}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="p-1 hover:bg-[#EAEAEA] rounded"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7F7F7] rounded text-xs">
              <div>
                <span className="text-[10px] uppercase text-[#8A8A8A] block">Buyer Name</span>
                <strong>{selectedQuote.name}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#8A8A8A] block">Company</span>
                <strong>{selectedQuote.company || 'Individual Reseller'}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#8A8A8A] block">Email</span>
                <span className="text-[#6B6B6B]">{selectedQuote.email}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#8A8A8A] block">Phone</span>
                <span className="text-[#6B6B6B]">{selectedQuote.phone}</span>
              </div>
              {selectedQuote.gstin && (
                <div className="col-span-2">
                  <span className="text-[10px] uppercase text-[#8A8A8A] block">GSTIN</span>
                  <span className="font-mono text-[#0A0A0A]">{selectedQuote.gstin}</span>
                </div>
              )}
            </div>

            {selectedQuote.notes && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded">
                <span className="text-[10px] uppercase font-bold text-[#8A8A8A] block mb-1">
                  Procurement Requirements & Notes
                </span>
                <p className="text-xs text-[#0A0A0A] whitespace-pre-wrap">
                  {selectedQuote.notes}
                </p>
              </div>
            )}

            {/* Status change actions */}
            <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#8A8A8A]">Mark Status:</span>
                {['reviewed', 'quoted', 'declined'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleUpdateStatus(selectedQuote.id, st)}
                    className="px-2 py-0.5 border border-[#EAEAEA] hover:border-[#0A0A0A] text-[10px] uppercase font-bold rounded"
                  >
                    {st}
                  </button>
                ))}
              </div>

              {selectedQuote.status !== 'converted' && (
                <button
                  type="button"
                  onClick={() => handleConvertToEstimate(selectedQuote)}
                  className="px-4 py-2 bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5"
                >
                  <FileSpreadsheet size={13} />
                  <span>Convert to Estimate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
