// src/components/admin/InventoryView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  ArrowUpDown, 
  History, 
  Plus, 
  Minus, 
  Check, 
  X,
  RefreshCw
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { formatINR } from '../../utils/formatters';
import useToastStore from '../../store/toastStore';

export default function InventoryView({ preselectedProduct, onClearPreselected }) {
  const addToast = useToastStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState('all'); // all, low, out, movements
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ all: 0, low: 0, out: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Movements State
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Quick Adjust Modal State
  const [adjustModalProduct, setAdjustModalProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('add'); // 'add', 'subtract', 'set'
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustReason, setAdjustReason] = useState('restock');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustRef, setAdjustRef] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    const res = await adminApi.getInventory({
      tab: activeTab === 'movements' ? 'all' : activeTab,
      search
    });

    if (res.data) {
      setItems(res.data.items || []);
      setCounts(res.data.counts || { all: 0, low: 0, out: 0 });
    }
    setLoading(false);
  };

  const fetchMovements = async () => {
    setLoadingMovements(true);
    const res = await adminApi.getMovements({ limit: 100 });
    if (res.data?.movements) {
      setMovements(res.data.movements);
    }
    setLoadingMovements(false);
  };

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovements();
    } else {
      fetchInventory();
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab !== 'movements') fetchInventory();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle preselected product from Dashboard
  useEffect(() => {
    if (preselectedProduct) {
      setAdjustModalProduct(preselectedProduct);
      setAdjustType('add');
      setAdjustQty(20);
      setAdjustReason('restock');
      if (onClearPreselected) onClearPreselected();
    }
  }, [preselectedProduct]);

  // Handle Stock Adjustment Submit
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModalProduct || !adjustReason) return;

    setSubmittingAdjust(true);
    const res = await adminApi.adjustStock({
      productId: adjustModalProduct.id,
      type: adjustType,
      quantity: Number(adjustQty),
      reason: adjustReason,
      notes: adjustNotes,
      referenceId: adjustRef
    });
    setSubmittingAdjust(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({
        type: 'success',
        message: `Stock updated for ${adjustModalProduct.name}: ${res.data?.stockBefore} → ${res.data?.stockAfter}`
      });
      setAdjustModalProduct(null);
      fetchInventory();
    }
  };

  // Live preview calculation for modal
  const calcNewStock = () => {
    if (!adjustModalProduct) return 0;
    const cur = adjustModalProduct.stock;
    const q = Number(adjustQty) || 0;
    if (adjustType === 'add') return cur + q;
    if (adjustType === 'subtract') return Math.max(0, cur - q);
    return Math.max(0, q);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Inventory & Stock Auditing
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Real-time stock tracking, mandatory adjustment logging, and movement audit trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === 'movements') fetchMovements();
              else fetchInventory();
            }}
            className="p-1.5 border border-[#EAEAEA] bg-white text-[#6B6B6B] hover:text-[#0A0A0A]"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-2">
        <div className="flex text-xs font-mono uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
              activeTab === 'all'
                ? 'border-[#FF4D00] text-[#0A0A0A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            All Stock ({counts.all})
          </button>

          <button
            onClick={() => setActiveTab('low')}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'low'
                ? 'border-[#FF4D00] text-[#FF4D00]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#FF4D00]" />
            Low Stock ({counts.low})
          </button>

          <button
            onClick={() => setActiveTab('out')}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
              activeTab === 'out'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            Out of Stock ({counts.out})
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'movements'
                ? 'border-[#0A0A0A] text-[#0A0A0A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Stock Movements History
          </button>
        </div>

        {activeTab !== 'movements' && (
          <div className="relative py-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 border border-[#EAEAEA] text-xs font-mono outline-none"
            />
          </div>
        )}
      </div>

      {/* Main Stock Table */}
      {activeTab !== 'movements' && (
        <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
                <th className="p-3">Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3">Supplier</th>
                <th className="p-3 text-center">Threshold</th>
                <th className="p-3 text-center">Current Stock</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Quick Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                    Loading stock records...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[#6B6B6B]">
                    No inventory records matching this view.
                  </td>
                </tr>
              )}

              {!loading && items.map(item => {
                const isOut = item.stock === 0;
                const isLow = !isOut && item.stock <= (item.low_stock_threshold || 3);

                return (
                  <tr key={item.id} className="hover:bg-[#FBFBFB]">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt="" className="w-9 h-9 object-contain bg-white border border-[#EAEAEA] p-0.5 shrink-0" />
                        <div>
                          <div className="font-semibold text-[#0A0A0A] line-clamp-1">{item.name}</div>
                          <div className="text-[11px] text-[#6B6B6B]">{item.brand}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-mono text-[#6B6B6B]">{item.sku || item.id}</td>
                    <td className="p-3 capitalize font-mono text-[#444]">{item.category}</td>
                    <td className="p-3 text-[#6B6B6B] text-xs">{item.supplier || 'TechBazaar Direct'}</td>

                    <td className="p-3 text-center font-mono text-[#6B6B6B]">
                      {item.low_stock_threshold || 3}
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-sm">
                      <span className={isOut ? 'text-red-600' : isLow ? 'text-[#FF4D00]' : 'text-[#0A0A0A]'}>
                        {item.stock}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono">
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold ${
                        isOut ? 'bg-red-100 text-red-600' : isLow ? 'bg-orange-100 text-[#FF4D00]' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setAdjustModalProduct(item);
                          setAdjustType(isOut || isLow ? 'add' : 'set');
                          setAdjustQty(isOut || isLow ? 20 : item.stock);
                          setAdjustReason('restock');
                          setAdjustNotes('');
                          setAdjustRef('');
                        }}
                        className="px-2.5 py-1 text-xs font-mono uppercase bg-[#0A0A0A] text-white hover:bg-[#FF4D00] transition-colors"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Movements Audit Trail Table */}
      {activeTab === 'movements' && (
        <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-center">Change</th>
                <th className="p-3 text-center">Stock Path</th>
                <th className="p-3">Mandatory Reason</th>
                <th className="p-3">Reference / Order</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0] font-mono">
              {loadingMovements && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[#6B6B6B]">
                    Loading stock audit trail...
                  </td>
                </tr>
              )}

              {!loadingMovements && movements.map(m => (
                <tr key={m.id} className="hover:bg-[#FBFBFB]">
                  <td className="p-3 text-[#6B6B6B] text-[11px]">
                    {new Date(m.created_at).toLocaleString()}
                  </td>

                  <td className="p-3 font-sans">
                    <div className="font-semibold text-[#0A0A0A] line-clamp-1">{m.product_name}</div>
                  </td>

                  <td className="p-3 text-[#6B6B6B]">{m.sku || m.product_id}</td>

                  <td className="p-3 text-center font-bold">
                    <span className={m.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </span>
                  </td>

                  <td className="p-3 text-center text-[#6B6B6B]">
                    {m.stock_before} → <span className="text-[#0A0A0A] font-bold">{m.stock_after}</span>
                  </td>

                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-[#0A0A0A] text-[10px] uppercase font-semibold">
                      {m.reason}
                    </span>
                  </td>

                  <td className="p-3 text-[#0A0A0A]">{m.reference_id || '—'}</td>
                  <td className="p-3 text-[#6B6B6B] font-sans text-xs">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK ADJUST STOCK MODAL (REASON-MANDATED) */}
      {/* ======================================================== */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#0A0A0A] p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  Adjust Stock Level
                </h3>
                <p className="text-[11px] text-[#6B6B6B] line-clamp-1">{adjustModalProduct.name}</p>
              </div>
              <button onClick={() => setAdjustModalProduct(null)} className="p-1">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                  Adjustment Mode
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  {[
                    { id: 'add', label: '+ Restock / Add' },
                    { id: 'subtract', label: '- Deduct / Waste' },
                    { id: 'set', label: '= Set Count' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAdjustType(m.id)}
                      className={`py-2 px-2 border text-center font-semibold transition-colors ${
                        adjustType === m.id
                          ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                          : 'bg-white border-[#EAEAEA] text-[#6B6B6B] hover:border-[#0A0A0A]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                  Quantity Units *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono font-bold focus:border-[#0A0A0A] outline-none"
                />
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                  Mandatory Audit Reason *
                </label>
                <select
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAEAEA] text-xs font-mono bg-white outline-none"
                >
                  <option value="restock">New Stock Inward / Restock</option>
                  <option value="damaged">Damaged / Defective In Warehouse</option>
                  <option value="returned">Customer Return Received</option>
                  <option value="correction">Inventory Physical Count Correction</option>
                  <option value="sample">Marketing Sample / Internal Use</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                  PO / Invoice / Reference # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-904"
                  value={adjustRef}
                  onChange={(e) => setAdjustRef(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                  Internal Notes
                </label>
                <input
                  type="text"
                  placeholder="Additional context for audit log..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs outline-none"
                />
              </div>

              {/* Live Preview Card */}
              <div className="p-3 bg-[#F7F7F7] border border-[#EAEAEA] text-xs font-mono flex items-center justify-between">
                <span>Before: <strong>{adjustModalProduct.stock}</strong></span>
                <span>→</span>
                <span>After: <strong className="text-[#FF4D00] text-sm">{calcNewStock()}</strong></span>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="flex-1 py-2 border border-[#EAEAEA] text-xs font-mono uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white text-xs font-mono uppercase hover:bg-[#FF4D00] transition-colors font-semibold"
                >
                  {submittingAdjust ? 'Updating...' : 'Confirm Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
