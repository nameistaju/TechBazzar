import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Search,
  ArrowRight
} from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { products } from '../data/products';
import { useStore } from '../context/StoreContext';
import { getWholesaleTier } from '../utils/wholesaleCalculation';

export default function QuickOrderPage() {
  const { addToCart, showToast, setIsCartOpen } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('grid'); // 'grid', 'paste'

  // Grid rows state
  const [rows, setRows] = useState([
    { id: 1, sku: products[0]?.sku || 'TB-SMR-0001', quantity: products[0]?.moq || 10 },
    { id: 2, sku: products[1]?.sku || 'TB-EAR-0002', quantity: products[1]?.moq || 10 },
    { id: 3, sku: '', quantity: 10 }
  ]);

  // Paste / CSV state
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);

  // Lookup helper by SKU or name
  const findProductBySku = (skuStr) => {
    if (!skuStr) return null;
    const clean = skuStr.trim().toLowerCase();
    return products.find(p => 
      (p.sku && p.sku.toLowerCase() === clean) || 
      p.id.toLowerCase() === clean ||
      p.name.toLowerCase().includes(clean)
    ) || null;
  };

  const handleRowSkuChange = (rowId, val) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const prod = findProductBySku(val);
      return {
        ...r,
        sku: val,
        quantity: prod ? Number(prod.moq || 10) : r.quantity
      };
    }));
  };

  const handleRowQtyChange = (rowId, val) => {
    const qty = Math.max(1, parseInt(val, 10) || 1);
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, quantity: qty } : r));
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, { id: Date.now(), sku: '', quantity: 10 }]);
  };

  const handleRemoveRow = (rowId) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Add all valid rows to cart
  const handleAddAllFromGrid = () => {
    let addedCount = 0;
    for (const row of rows) {
      const prod = findProductBySku(row.sku);
      if (prod) {
        addToCart(prod, row.quantity, false);
        addedCount++;
      }
    }
    if (addedCount > 0) {
      showToast(`Added ${addedCount} products to wholesale cart!`, 'View Cart', () => setIsCartOpen(true));
    } else {
      showToast('Please enter valid SKUs before adding to cart.');
    }
  };

  // Process pasted CSV lines: "SKU, Qty" or "SKU \t Qty"
  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n');
    const results = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/[,;\t]/).map(s => s.trim());
      const sku = parts[0];
      const qty = parseInt(parts[1], 10) || 10;
      const product = findProductBySku(sku);

      results.push({
        rawSku: sku,
        quantity: qty,
        product,
        valid: Boolean(product),
        belowMoq: product ? qty < (product.moq || 10) : false
      });
    }

    setParsedItems(results);
  };

  // File upload handler (.csv / .txt)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setPasteText(content);
        setActiveTab('paste');
      }
    };
    reader.readAsText(file);
  };

  const handleAddAllFromPaste = () => {
    const validItems = parsedItems.filter(it => it.valid);
    if (validItems.length === 0) {
      showToast('No valid products to add.');
      return;
    }

    for (const item of validItems) {
      addToCart(item.product, item.quantity, false);
    }
    showToast(`Added ${validItems.length} products to wholesale cart!`, 'View Cart', () => setIsCartOpen(true));
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Quick Order' }]} />

        {/* Header */}
        <div className="py-6 border-b border-[#EAEAEA] mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#FF4D00] font-bold block mb-1">
              B2B Fast Procurement
            </span>
            <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-wider text-[#0A0A0A]">
              Quick Bulk Order
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-1.5 max-w-xl">
              Rapid multi-line SKU entry and spreadsheet batch upload for retailers and distributors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/quote"
              className="text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              Need Custom Quote? →
            </Link>
          </div>
        </div>

        {/* Tabs: Grid Entry vs Paste / Upload */}
        <div className="flex items-center border-b border-[#EAEAEA] mb-8 gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors relative ${
              activeTab === 'grid'
                ? 'text-[#0A0A0A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#FF4D00]'
                : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
            }`}
          >
            SKU Entry Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors relative ${
              activeTab === 'paste'
                ? 'text-[#0A0A0A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#FF4D00]'
                : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
            }`}
          >
            Batch Paste & CSV Upload
          </button>
        </div>

        {/* Tab 1: Grid Entry */}
        {activeTab === 'grid' && (
          <div className="space-y-6">
            <div className="border border-[#EAEAEA] rounded-[4px] bg-white overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] text-[#6B6B6B] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[200px]">SKU / Product Code</th>
                    <th className="py-3 px-3 min-w-[220px]">Resolved Product</th>
                    <th className="py-3 px-3 w-28">Quantity</th>
                    <th className="py-3 px-3 w-28">Unit Price</th>
                    <th className="py-3 px-3 w-32 text-right">Line Total</th>
                    <th className="py-3 px-3 w-12 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2F2]">
                  {rows.map((row, idx) => {
                    const prod = findProductBySku(row.sku);
                    const tier = prod ? getWholesaleTier(prod, row.quantity) : null;

                    return (
                      <tr key={row.id} className="hover:bg-[#FAFAFA]">
                        <td className="py-3 px-3 text-center text-[#8A8A8A] font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="e.g. TB-CAB-0001 or product name"
                            value={row.sku}
                            onChange={(e) => handleRowSkuChange(row.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#EAEAEA] rounded bg-white font-mono text-xs outline-none focus:border-[#0A0A0A]"
                          />
                        </td>
                        <td className="py-3 px-3">
                          {prod ? (
                            <div className="flex items-center gap-2.5">
                              <img src={prod.image} alt={prod.name} className="w-8 h-8 object-contain shrink-0 rounded bg-white border border-[#EAEAEA] p-0.5" />
                              <div className="min-w-0">
                                <span className="font-medium text-[#0A0A0A] line-clamp-1">{prod.name}</span>
                                <span className="text-[10px] text-[#6B6B6B]">MOQ: {prod.moq || 10} • Pack: {prod.packSize || 5}</span>
                              </div>
                            </div>
                          ) : row.sku ? (
                            <span className="text-[11px] text-red-500 flex items-center gap-1">
                              <AlertCircle size={12} /> Unknown SKU
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#BDBDBD] italic">Enter SKU to resolve</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="1"
                            step={prod ? prod.packSize || 5 : 5}
                            value={row.quantity}
                            onChange={(e) => handleRowQtyChange(row.id, e.target.value)}
                            className="w-20 px-2 py-1.5 border border-[#EAEAEA] rounded bg-white text-xs font-semibold tabular-nums outline-none focus:border-[#0A0A0A]"
                          />
                        </td>
                        <td className="py-3 px-3 tabular-nums">
                          {tier ? (
                            <div>
                              <div className="font-semibold text-[#0A0A0A]">₹{tier.unitPrice.toLocaleString('en-IN')}</div>
                              <div className="text-[9px] text-[#FF4D00]">Tier {tier.activeTier}</div>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#0A0A0A] tabular-nums">
                          {tier ? `₹${tier.lineTotal.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-[#BDBDBD] hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-dashed border-[#BDBDBD] hover:border-[#0A0A0A] text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] transition-colors"
              >
                <Plus size={13} /> Add Row
              </button>

              <button
                type="button"
                onClick={handleAddAllFromGrid}
                className="bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest px-8 py-3.5 rounded transition-colors flex items-center gap-2 shadow-sm"
              >
                <ShoppingBag size={14} /> Add All Items to Cart
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Batch Paste & Upload */}
        {activeTab === 'paste' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Input Textarea */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
                    Paste SKU & Quantity (One per line)
                  </label>
                  <span className="text-[11px] text-[#6B6B6B]">Format: SKU, Quantity</span>
                </div>
                <textarea
                  rows={8}
                  placeholder="TB-CAB-0001, 50&#10;TB-EAR-0002, 25&#10;TB-POW-0003, 10"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full p-3 border border-[#EAEAEA] rounded bg-[#FAFAFA] font-mono text-xs outline-none focus:border-[#0A0A0A] focus:bg-white resize-y"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleParsePaste}
                    className="bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded transition-colors"
                  >
                    Validate & Preview Lines
                  </button>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded border border-[#EAEAEA] hover:border-[#0A0A0A] text-xs font-medium text-[#0A0A0A] transition-colors">
                    <Upload size={13} /> Upload CSV File
                    <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Right: Format Guide */}
              <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-5 text-xs space-y-3">
                <h3 className="font-semibold uppercase tracking-wider text-[#0A0A0A] flex items-center gap-1.5">
                  <FileText size={14} className="text-[#FF4D00]" /> Spreadsheet Import Guide
                </h3>
                <p className="text-[#6B6B6B] leading-relaxed">
                  Export from your internal ERP or Excel as CSV with two columns: column 1 for the SKU, column 2 for the requested units.
                </p>
                <div className="p-3 bg-white rounded border border-[#EAEAEA] font-mono text-[11px] text-[#0A0A0A] space-y-1">
                  <div>TB-SMR-0001, 20</div>
                  <div>TB-EAR-0002, 50</div>
                  <div>TB-WAT-0004, 15</div>
                </div>
                <div className="text-[11px] text-[#6B6B6B]">
                  • Unrecognized SKUs are flagged safely before adding to cart.<br/>
                  • Volume discount brackets apply automatically to each validated line.
                </div>
              </div>
            </div>

            {/* Parsed Preview Table */}
            {parsedItems.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#EAEAEA]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
                    Parsed Items ({parsedItems.filter(p => p.valid).length} valid of {parsedItems.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddAllFromPaste}
                    className="bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs font-semibold uppercase tracking-widest px-6 py-2.5 rounded transition-colors flex items-center gap-1.5"
                  >
                    <ShoppingBag size={13} /> Add All Valid Items to Cart
                  </button>
                </div>

                <div className="border border-[#EAEAEA] rounded-[4px] overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] text-[#6B6B6B] uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Input SKU</th>
                        <th className="py-2.5 px-3">Matched Catalog Product</th>
                        <th className="py-2.5 px-3">Quantity</th>
                        <th className="py-2.5 px-3">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F2F2]">
                      {parsedItems.map((item, idx) => (
                        <tr key={idx} className={item.valid ? 'hover:bg-[#FAFAFA]' : 'bg-red-50/50'}>
                          <td className="py-2.5 px-3 font-mono font-medium">{item.rawSku}</td>
                          <td className="py-2.5 px-3">
                            {item.product ? item.product.name : <span className="text-red-500 font-medium">SKU Not Found</span>}
                          </td>
                          <td className="py-2.5 px-3 font-semibold tabular-nums">{item.quantity} units</td>
                          <td className="py-2.5 px-3 tabular-nums">
                            {item.product ? `₹${getWholesaleTier(item.product, item.quantity).unitPrice.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.valid ? (
                              <span className="text-[10px] font-semibold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Valid
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                Invalid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
