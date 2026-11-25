import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check, Plus, Minus } from 'lucide-react';
import { useStore } from '@app/providers/StoreContext';
import { getWholesaleTier } from '@shared/utils/wholesaleCalculation';

export default function ProductTableView({ products = [] }) {
  const { addToCart, showToast, setIsCartOpen } = useStore();
  const [selectedIds, setSelectedIds] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [addedRowIds, setAddedRowIds] = useState(new Set());

  // Helper to get or init row quantity
  const getRowQty = (product) => {
    return quantities[product.id] ?? Number(product.moq || 10);
  };

  const handleStepDown = (product) => {
    const moq = Number(product.moq || 10);
    const pack = Number(product.packSize || 5);
    const current = getRowQty(product);
    const next = Math.max(moq, current - pack);
    setQuantities(prev => ({ ...prev, [product.id]: next }));
  };

  const handleStepUp = (product) => {
    const pack = Number(product.packSize || 5);
    const current = getRowQty(product);
    const next = current + pack;
    setQuantities(prev => ({ ...prev, [product.id]: next }));
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAddSingle = (product) => {
    const qty = getRowQty(product);
    addToCart(product, qty);
    setAddedRowIds(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedRowIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1500);
  };

  // Bulk Add
  const handleBulkAdd = () => {
    const selectedProds = products.filter(p => selectedIds.includes(p.id));
    if (selectedProds.length === 0) return;

    for (const prod of selectedProds) {
      const qty = getRowQty(prod);
      addToCart(prod, qty, false);
    }

    showToast(`Added ${selectedProds.length} products to wholesale cart!`, 'View Cart', () => setIsCartOpen(true));
    setSelectedIds([]);
  };

  // Calculate bulk summary
  const selectedSummary = products
    .filter(p => selectedIds.includes(p.id))
    .reduce((acc, p) => {
      const q = getRowQty(p);
      const tier = getWholesaleTier(p, q);
      return {
        count: acc.count + 1,
        totalUnits: acc.totalUnits + q,
        totalAmount: acc.totalAmount + tier.lineTotal
      };
    }, { count: 0, totalUnits: 0, totalAmount: 0 });

  return (
    <div className="relative">
      <div className="w-full overflow-x-auto border border-[#EAEAEA] rounded-[4px] bg-white shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] text-[#6B6B6B] uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === products.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-[#BDBDBD] text-accent-text focus:ring-accent cursor-pointer"
                  title="Select All"
                />
              </th>
              <th className="py-3 px-3 w-16">Item</th>
              <th className="py-3 px-3 min-w-[200px]">Product & SKU</th>
              <th className="py-3 px-3">MOQ / Pack</th>
              <th className="py-3 px-3">Tier 1 (MOQ+)</th>
              <th className="py-3 px-3">Tier 2 (50+)</th>
              <th className="py-3 px-3">Tier 3 (100+)</th>
              <th className="py-3 px-3">Stock</th>
              <th className="py-3 px-3 min-w-[110px]">Quantity</th>
              <th className="py-3 px-3 text-right">Line Total</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F2F2]">
            {products.map((product) => {
              const qty = getRowQty(product);
              const tierInfo = getWholesaleTier(product, qty);
              const isSelected = selectedIds.includes(product.id);
              const isAdded = addedRowIds.has(product.id);

              return (
                <tr 
                  key={product.id}
                  className={`hover:bg-[#FAFAFA] transition-colors ${
                    isSelected ? 'bg-[#FFF9F6]' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRow(product.id)}
                      className="rounded border-[#BDBDBD] text-accent-text focus:ring-accent cursor-pointer"
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="py-3 px-3">
                    <Link to={`/product/${product.id}`} className="block w-12 h-12 rounded bg-[#FAFAFA] p-1 border border-[#EAEAEA] overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </Link>
                  </td>

                  {/* Name & SKU */}
                  <td className="py-3 px-3">
                    <div className="font-mono text-[9px] text-[#8A8A8A] uppercase tracking-wider mb-0.5">
                      {product.sku || 'TB-B2B'}
                    </div>
                    <Link 
                      to={`/product/${product.id}`}
                      className="font-medium text-[#0A0A0A] hover:text-accent-text line-clamp-1 transition-colors"
                      title={product.name}
                    >
                      {product.name}
                    </Link>
                    <div className="text-[10px] text-[#6B6B6B] mt-0.5">
                      {product.brand}
                    </div>
                  </td>

                  {/* MOQ & Pack */}
                  <td className="py-3 px-3">
                    <span className="inline-block bg-[#0A0A0A] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase">
                      MOQ {product.moq || 10}
                    </span>
                    <div className="text-[10px] text-[#8A8A8A] mt-0.5">
                      Pack: {product.packSize || 5}
                    </div>
                  </td>

                  {/* Tier 1 Price */}
                  <td className={`py-3 px-3 tabular-nums ${tierInfo.activeTier === 1 ? 'font-bold text-accent-text' : 'text-[#6B6B6B]'}`}>
                    ₹{(product.tier1Price || product.price).toLocaleString('en-IN')}
                  </td>

                  {/* Tier 2 Price */}
                  <td className={`py-3 px-3 tabular-nums ${tierInfo.activeTier === 2 ? 'font-bold text-accent-text' : 'text-[#6B6B6B]'}`}>
                    ₹{(product.tier2Price || Math.round(product.price * 0.9)).toLocaleString('en-IN')}
                  </td>

                  {/* Tier 3 Price */}
                  <td className={`py-3 px-3 tabular-nums ${tierInfo.activeTier === 3 ? 'font-bold text-accent-text' : 'text-[#6B6B6B]'}`}>
                    ₹{(product.tier3Price || Math.round(product.price * 0.8)).toLocaleString('en-IN')}
                  </td>

                  {/* Stock */}
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {product.stock || 50} units
                    </span>
                  </td>

                  {/* Quantity Stepper */}
                  <td className="py-3 px-3">
                    <div className="flex items-center border border-[#EAEAEA] rounded bg-[#FAFAFA] overflow-hidden h-7 w-24">
                      <button
                        type="button"
                        onClick={() => handleStepDown(product)}
                        disabled={qty <= (product.moq || 10)}
                        className="w-7 h-full flex items-center justify-center text-[#6B6B6B] hover:text-[#0A0A0A] disabled:opacity-30"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="flex-1 text-center font-semibold text-[#0A0A0A] tabular-nums text-xs">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStepUp(product)}
                        className="w-7 h-full flex items-center justify-center text-[#6B6B6B] hover:text-[#0A0A0A]"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </td>

                  {/* Line Total */}
                  <td className="py-3 px-3 text-right">
                    <div className="font-bold text-[#0A0A0A] tabular-nums">
                      ₹{tierInfo.lineTotal.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9px] text-[#8A8A8A] tabular-nums">
                      @ ₹{tierInfo.unitPrice}/u
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleAddSingle(product)}
                      className={`h-7 px-3 rounded text-[10px] font-semibold tracking-wider uppercase transition-colors inline-flex items-center gap-1 ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0A0A0A] text-accent-contrast hover:bg-accent'
                      }`}
                    >
                      {isAdded ? <Check size={12} /> : <ShoppingBag size={11} />}
                      {isAdded ? 'Added' : 'Add'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 left-0 right-0 z-30 mt-4 p-3.5 bg-[#0A0A0A] text-white rounded-[4px] shadow-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="bg-accent text-accent-contrast text-[11px] font-bold px-2 py-0.5 rounded uppercase">
              {selectedSummary.count} Items
            </span>
            <span className="text-xs text-neutral-300">
              Total Units: <strong className="text-white tabular-nums">{selectedSummary.totalUnits}</strong>
            </span>
            <span className="text-xs text-neutral-300">
              Estimated Total: <strong className="text-white tabular-nums text-sm">₹{selectedSummary.totalAmount.toLocaleString('en-IN')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkAdd}
              className="bg-accent text-accent-contrast text-xs font-semibold uppercase tracking-wider px-5 py-2 rounded hover:bg-accent-hover transition-colors flex items-center gap-1.5 shadow-md"
            >
              <ShoppingBag size={13} />
              Add All Selected to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
