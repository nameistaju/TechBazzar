// src/pages/QuickOrderPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Upload, 
  FileText, 
  AlertCircle, 
  RefreshCw,
  Search,
  Wand2
} from 'lucide-react';
import Breadcrumbs from '@shared/ui/Breadcrumbs';
import { useProducts } from '@shared/hooks/useCatalog';
import { useStore } from '@app/providers/StoreContext';
import useAuthStore from '@shared/store/authStore';
import { getWholesaleTier } from '@shared/utils/wholesaleCalculation';
import SkuCombobox from '@features/wholesale/components/SkuCombobox';
import productsApi from '@shared/api/productsApi';
import { formatINR } from '@shared/utils/formatters';

export default function QuickOrderPage() {
  const { mode, addToCart, showToast, setIsCartOpen, isApprovedWholesaleUser } = useStore();
  const { user } = useAuthStore();
  const _navigate = useNavigate();

  const { data: catalogData } = useProducts({ limit: 100 });
  const products = catalogData?.products || [];

  const isWholesale = mode === 'wholesale';
  const isApproved = isApprovedWholesaleUser || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('grid'); // 'grid', 'paste'

  // Grid rows state: each row holds id, sku, product, quantity
  const [rows, setRows] = useState(() => [
    { id: 1, sku: '', product: null, quantity: isWholesale ? 10 : 1 },
    { id: 2, sku: '', product: null, quantity: isWholesale ? 10 : 1 },
    { id: 3, sku: '', product: null, quantity: isWholesale ? 10 : 1 }
  ]);

  // Populate initial 2 sample rows once live catalog loads
  useEffect(() => {
    if (products.length >= 2) {
      setRows((prev) => {
        if (prev.some((r) => r.product !== null || r.sku !== '')) return prev;
        return [
          { id: 1, sku: products[0].sku || products[0].id, product: products[0], quantity: isWholesale ? Number(products[0].moq || 10) : 1 },
          { id: 2, sku: products[1].sku || products[1].id, product: products[1], quantity: isWholesale ? Number(products[1].moq || 10) : 1 },
          { id: 3, sku: '', product: null, quantity: isWholesale ? 10 : 1 }
        ];
      });
    }
  }, [products, isWholesale]);

  // Ref map for quantity inputs so focus can smoothly jump after product selection
  const qtyInputRefs = useRef({});

  // Paste / CSV state
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isParsing, setIsParsing] = useState(false);

  // Sync rows MOQ when mode switches
  useEffect(() => {
    if (isWholesale) {
      setRows(prev => prev.map(r => ({
        ...r,
        quantity: r.product ? Math.max(Number(r.product.moq || 10), r.quantity) : r.quantity
      })));
    }
  }, [isWholesale]);

  // Lookup helper by SKU or ID or exact name
  const findProductBySku = (skuStr) => {
    if (!skuStr) return null;
    const clean = skuStr.trim().toLowerCase();
    if (['sku', 'quantity', 'qty', 'product', 'header'].includes(clean)) return null;
    return products.find(p => 
      (p.sku && p.sku.toLowerCase() === clean) || 
      p.id.toLowerCase() === clean ||
      p.name.toLowerCase() === clean
    ) || null;
  };

  const handleRowSkuChange = (rowId, val) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const prod = findProductBySku(val);
      return {
        ...r,
        sku: val,
        product: prod || (val === '' ? null : r.product),
        quantity: prod ? Number(isWholesale ? (prod.moq || 10) : 1) : r.quantity
      };
    }));
  };

  const handleRowQtyChange = (rowId, val) => {
    const qty = Math.max(1, parseInt(val, 10) || 1);
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, quantity: qty } : r));
  };

  const handleAddRow = () => {
    const newId = Date.now() + Math.random();
    setRows(prev => [...prev, { id: newId, sku: '', product: null, quantity: isWholesale ? 10 : 1 }]);
  };

  const handleRemoveRow = (rowId) => {
    setRows(prev => {
      if (prev.length <= 1) {
        return [{ id: Date.now(), sku: '', product: null, quantity: isWholesale ? 10 : 1 }];
      }
      return prev.filter(r => r.id !== rowId);
    });
  };

  // When a product is chosen from the Combobox
  const handleSelectProduct = (rowId, selectedProduct) => {
    if (!selectedProduct) return;

    // Check if product is already in another row
    const existingRow = rows.find(r => 
      r.id !== rowId && 
      (r.product?.id === selectedProduct.id || (r.sku && r.sku.toLowerCase() === selectedProduct.sku.toLowerCase()))
    );

    if (existingRow) {
      // Increase existing row's quantity by pack size or step quantity
      const step = isWholesale ? Number(selectedProduct.packSize || selectedProduct.stepQuantity || 5) : 1;
      const newQty = existingRow.quantity + step;

      setRows(prev => prev.map(r => {
        if (r.id === existingRow.id) {
          return { ...r, quantity: newQty };
        }
        if (r.id === rowId) {
          // Reset the current blank row
          return { ...r, sku: '', product: null, quantity: isWholesale ? 10 : 1 };
        }
        return r;
      }));

      showToast(`Product already in list. Increased quantity to ${newQty}.`);
      qtyInputRefs.current[existingRow.id]?.focus();
      return;
    }

    // Assign to current row
    const initialQty = isWholesale ? Number(selectedProduct.moq || 10) : 1;
    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          sku: selectedProduct.sku,
          product: selectedProduct,
          quantity: initialQty
        };
      }
      return r;
    }));

    // Jump focus to quantity input
    setTimeout(() => {
      const el = qtyInputRefs.current[rowId];
      if (el) {
        el.focus();
        el.select?.();
      }
    }, 50);
  };

  // When multiple products are chosen via the multi-select checkboxes
  const handleAddMultiple = (rowId, productsArray) => {
    if (!productsArray || productsArray.length === 0) return;

    setRows(prev => {
      const next = [...prev];
      const currentRow = next.find(r => r.id === rowId);

      productsArray.forEach((p, idx) => {
        // Check if already in table
        const existing = next.find(r => 
          r.product?.id === p.id || (r.sku && r.sku.toLowerCase() === p.sku.toLowerCase())
        );

        if (existing) {
          const step = isWholesale ? Number(p.packSize || p.stepQuantity || 5) : 1;
          existing.quantity += step;
        } else if (idx === 0 && currentRow && !currentRow.product) {
          // Fill current row with the first product
          currentRow.sku = p.sku;
          currentRow.product = p;
          currentRow.quantity = isWholesale ? Number(p.moq || 10) : 1;
        } else {
          // Append new row
          next.push({
            id: Date.now() + idx + Math.random(),
            sku: p.sku,
            product: p,
            quantity: isWholesale ? Number(p.moq || 10) : 1
          });
        }
      });

      return next;
    });

    showToast(`Added ${productsArray.length} products to matrix!`);
  };

  // Add all valid rows to cart
  const handleAddAllFromGrid = () => {
    let addedCount = 0;
    for (const row of rows) {
      const prod = row.product || findProductBySku(row.sku);
      if (prod) {
        addToCart(prod, row.quantity, false);
        addedCount++;
      }
    }
    if (addedCount > 0) {
      showToast(
        `Added ${addedCount} products to ${isWholesale ? 'wholesale' : 'retail'} cart!`, 
        'View Cart', 
        () => setIsCartOpen(true)
      );
    } else {
      showToast('Please enter or select valid products before adding to cart.');
    }
  };

  // Process pasted CSV lines with "Did you mean...?" suggestions
  const handleParsePaste = async () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    const lines = pasteText.split('\n');
    const results = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Skip header row if present
      if (/^(sku|product|item)[,;\t]/i.test(trimmed)) continue;
      const parts = trimmed.split(/[,;\t]/).map(s => s.trim());
      const sku = parts[0];
      const qty = parseInt(parts[1], 10) || (isWholesale ? 10 : 1);
      let product = findProductBySku(sku);
      let suggestions = [];

      // If not recognized immediately, call suggest endpoint
      if (!product && sku.length >= 2) {
        try {
          const res = await productsApi.getSuggestions({ q: sku, mode, limit: 3 });
          if (res.data?.suggestions && res.data.suggestions.length > 0) {
            suggestions = res.data.suggestions;
          }
        } catch {}
      }

      results.push({
        rawSku: sku,
        quantity: qty,
        product,
        valid: Boolean(product),
        belowMoq: product && isWholesale ? qty < Number(product.moq || 10) : false,
        suggestions
      });
    }

    setParsedItems(results);
    setIsParsing(false);
  };

  // 1-Click fix for unrecognized CSV / paste lines
  const handleFixParsedItem = (index, suggestedProduct) => {
    setParsedItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        rawSku: suggestedProduct.sku,
        product: suggestedProduct,
        valid: true,
        belowMoq: isWholesale && item.quantity < Number(suggestedProduct.moq || 10),
        suggestions: []
      };
    }));
    showToast(`Updated to ${suggestedProduct.name} (${suggestedProduct.sku})`);
  };

  const handleLoadSample = () => {
    const sample = `TB-EAR-0001, 50\nTB-CHA-0048, 100\nTB-POW-0045, 25\nTB-HEA-5641, 15\nTB-SMA-0025, 5\nTB-ACC-0116, 30`;
    setPasteText(sample);
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
    const validItems = parsedItems.filter(it => it.valid && it.product);
    if (validItems.length === 0) {
      showToast('No valid products to add.');
      return;
    }

    for (const item of validItems) {
      addToCart(item.product, item.quantity, false);
    }
    showToast(`Added ${validItems.length} products to ${isWholesale ? 'wholesale' : 'retail'} cart!`, 'View Cart', () => setIsCartOpen(true));
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Quick Order' }]} />

        {/* Header */}
        <div className="py-6 border-b border-[#EAEAEA] mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#FF4D00] font-bold">
                {isWholesale ? 'B2B Fast Procurement' : 'Direct Catalog Purchase'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                isWholesale ? 'bg-[#0A0A0A] text-[#FF4D00]' : 'bg-gray-100 text-[#0A0A0A]'
              }`}>
                {isWholesale ? 'Wholesale Mode' : 'Retail Mode'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-wider text-[#0A0A0A]">
              Quick Bulk Order
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-1.5 max-w-xl">
              Rapid multi-line SKU entry with searchable combobox and spreadsheet batch upload for retailers and distributors.
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
            {/* Mobile / Tablet Card View (< md) */}
            <div className="md:hidden space-y-3">
              {rows.map((row, idx) => {
                const prod = row.product || findProductBySku(row.sku);
                const tier = prod && isWholesale ? getWholesaleTier(prod, row.quantity) : null;
                const unitPrice = tier ? tier.unitPrice : (prod ? Number(prod.price || 0) : 0);
                const lineTotal = prod ? unitPrice * row.quantity : 0;
                return (
                  <div key={row.id} className="bg-white border border-[#EAEAEA] rounded-[4px] p-3.5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#6B6B6B] font-semibold">ROW #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8A8A8A] hover:text-red-500 -mr-2"
                        aria-label={`Remove row ${idx + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <SkuCombobox
                      value={row.sku}
                      onChange={(val) => handleRowSkuChange(row.id, val)}
                      onSelect={(selectedProd) => {
                        handleSelectProduct(row.id, selectedProd);
                      }}
                      existingSkus={new Set(rows.filter(r => r.id !== row.id && r.sku).map(r => r.sku.toLowerCase()))}
                      mode={mode}
                      isApprovedWholesale={isApproved}
                    />
                    {prod && (
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#F2F2F2]">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#0A0A0A] truncate">{prod.name}</div>
                          <div className="text-[11px] font-mono text-[#6B6B6B]">{formatINR(unitPrice)} / unit</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={isWholesale ? (prod?.moq || 10) : 1}
                            step={isWholesale ? (prod?.packSize || 5) : 1}
                            value={row.quantity}
                            onChange={(e) => handleRowQtyChange(row.id, e.target.value)}
                            aria-label={`Quantity for ${prod.name}`}
                            className="w-20 min-h-[44px] px-2.5 border border-[#EAEAEA] rounded bg-white text-xs font-semibold tabular-nums"
                          />
                          <div className="text-right min-w-[72px] font-mono text-xs font-bold text-[#0A0A0A]">
                            {formatINR(lineTotal)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block border border-[#EAEAEA] rounded-[4px] bg-white min-h-[420px] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] text-[#6B6B6B] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[240px] sm:min-w-[280px]">SKU / Product Code</th>
                    <th className="py-3 px-3 min-w-[220px]">Resolved Product</th>
                    <th className="py-3 px-3 w-28">Quantity</th>
                    <th className="py-3 px-3 w-28">Unit Price</th>
                    <th className="py-3 px-3 w-32 text-right">Line Total</th>
                    <th className="py-3 px-3 w-12 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2F2]">
                  {rows.map((row, idx) => {
                    const prod = row.product || findProductBySku(row.sku);
                    const tier = prod && isWholesale ? getWholesaleTier(prod, row.quantity) : null;
                    const unitPrice = tier ? tier.unitPrice : (prod ? Number(prod.price || 0) : 0);
                    const lineTotal = prod ? unitPrice * row.quantity : 0;

                    return (
                      <tr key={row.id} className="hover:bg-[#FAFAFA] transition-colors">
                        {/* 1. Row Index */}
                        <td className="py-3 px-3 text-center text-[#8A8A8A] font-mono">
                          {idx + 1}
                        </td>

                        {/* 2. SKU / Search Combobox */}
                        <td className="py-3 px-3 relative">
                          <SkuCombobox
                            value={row.sku}
                            rowId={row.id}
                            onChange={(val) => handleRowSkuChange(row.id, val)}
                            onSelectProduct={(p) => handleSelectProduct(row.id, p)}
                            onAddMultiple={(arr) => handleAddMultiple(row.id, arr)}
                            onFocusNext={() => {
                              const el = qtyInputRefs.current[row.id];
                              if (el) {
                                el.focus();
                                el.select?.();
                              }
                            }}
                            existingSkus={new Set(rows.filter(r => r.id !== row.id && r.sku).map(r => r.sku.toLowerCase()))}
                            mode={mode}
                            isApprovedWholesale={isApproved}
                          />
                        </td>

                        {/* 3. Resolved Product Cell */}
                        <td className="py-3 px-3">
                          {prod ? (
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={prod.image || '/images/placeholder-product.svg'} 
                                alt={prod.name} 
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/images/placeholder-product.svg';
                                }}
                                className="w-8 h-8 object-contain shrink-0 rounded bg-white border border-[#EAEAEA] p-0.5" 
                              />
                              <div className="min-w-0">
                                <span className="font-medium text-[#0A0A0A] line-clamp-1">{prod.name}</span>
                                <span className="text-[10px] text-[#6B6B6B] font-mono">
                                  {isWholesale ? (
                                    `MOQ: ${prod.moq || 10} • Pack: ${prod.packSize || 5}`
                                  ) : (
                                    `${prod.brand} • In Stock: ${prod.stock || 0}`
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : row.sku ? (
                            row.sku.trim().toUpperCase().startsWith('TB-') ? (
                              <span className="text-[11px] text-red-500 flex items-center gap-1 font-mono">
                                <AlertCircle size={12} /> Unknown SKU
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#8A8A8A] flex items-center gap-1 font-mono">
                                <Search size={12} className="text-[#FF4D00]" />
                                <span>Select from dropdown</span>
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-[#BDBDBD] italic">Type SKU or name to resolve</span>
                          )}
                        </td>

                        {/* 4. Quantity Stepper */}
                        <td className="py-3 px-3">
                          <input
                            ref={el => qtyInputRefs.current[row.id] = el}
                            type="number"
                            min={isWholesale ? (prod?.moq || 10) : 1}
                            step={isWholesale ? (prod?.packSize || 5) : 1}
                            value={row.quantity}
                            onChange={(e) => handleRowQtyChange(row.id, e.target.value)}
                            className="w-20 px-2 py-1.5 border border-[#EAEAEA] rounded bg-white text-xs font-semibold tabular-nums outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A]"
                          />
                        </td>

                        {/* 5. Unit Price */}
                        <td className="py-3 px-3 tabular-nums">
                          {prod ? (
                            <div>
                              <div className="font-semibold text-[#0A0A0A] font-mono">
                                {formatINR(unitPrice)}
                              </div>
                              {tier ? (
                                <div className="text-[9px] text-[#FF4D00] font-mono">
                                  Tier {tier.activeTier}
                                </div>
                              ) : (
                                <div className="text-[9px] text-[#6B6B6B] font-mono">
                                  Retail Price
                                </div>
                              )}
                            </div>
                          ) : '—'}
                        </td>

                        {/* 6. Line Total */}
                        <td className="py-3 px-3 text-right font-bold text-[#0A0A0A] tabular-nums font-mono">
                          {prod ? formatINR(lineTotal) : '—'}
                        </td>

                        {/* 7. Delete Row Button */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-[#BDBDBD] hover:text-red-500 transition-colors p-1"
                            title="Remove row"
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
                className="bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest px-8 py-3.5 rounded transition-colors flex items-center gap-2 shadow-sm font-mono"
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
                  <span className="text-[11px] text-[#6B6B6B] font-mono">Format: SKU, Quantity</span>
                </div>
                <textarea
                  rows={8}
                  placeholder="TB-CAB-0001, 50&#10;TB-EAR-0002, 25&#10;TB-POW-0045, 10"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full p-3 border border-[#EAEAEA] rounded bg-[#FAFAFA] font-mono text-xs outline-none focus:border-[#0A0A0A] focus:bg-white resize-y"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleParsePaste}
                    disabled={isParsing}
                    className="bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded transition-colors flex items-center gap-1.5"
                  >
                    {isParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    Validate & Preview Lines
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="px-4 py-2.5 rounded border border-[#EAEAEA] hover:border-[#FF4D00] hover:text-[#FF4D00] text-xs font-medium text-[#0A0A0A] bg-white transition-colors"
                  >
                    Load Sample Data
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
                  <div>TB-EAR-0001, 20</div>
                  <div>TB-CHA-0048, 50</div>
                  <div>TB-POW-0045, 15</div>
                </div>
                <div className="text-[11px] text-[#6B6B6B]">
                  • Unrecognized SKUs are flagged safely with 1-click "Did you mean...?" suggestions.<br/>
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
                      {parsedItems.map((item, idx) => {
                        const tier = item.product && isWholesale ? getWholesaleTier(item.product, item.quantity) : null;
                        const price = tier ? tier.unitPrice : (item.product ? Number(item.product.price || 0) : 0);

                        return (
                          <tr key={idx} className={item.valid ? 'hover:bg-[#FAFAFA]' : 'bg-red-50/40'}>
                            <td className="py-2.5 px-3 font-mono font-medium">{item.rawSku}</td>
                            <td className="py-2.5 px-3">
                              {item.product ? (
                                <div className="font-medium text-[#0A0A0A]">{item.product.name}</div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-red-500 font-medium flex items-center gap-1">
                                    <AlertCircle size={12} /> Unrecognized: "{item.rawSku}"
                                  </span>
                                  {item.suggestions && item.suggestions.length > 0 && (
                                    <div className="flex items-center flex-wrap gap-1.5 text-[11px] pt-0.5">
                                      <span className="text-[#6B6B6B] font-mono text-[10px] flex items-center gap-1">
                                        <Wand2 size={10} className="text-[#FF4D00]" /> Did you mean:
                                      </span>
                                      {item.suggestions.map((s) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => handleFixParsedItem(idx, s)}
                                          className="px-1.5 py-0.5 bg-white border border-[#FF4D00]/40 text-[#FF4D00] hover:bg-[#FF4D00] hover:text-white rounded text-[10px] font-mono transition-colors"
                                          title={`Replace with ${s.name} (${s.sku})`}
                                        >
                                          {s.name.slice(0, 24)}... ({s.sku})
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold tabular-nums font-mono">
                              {item.quantity} units
                            </td>
                            <td className="py-2.5 px-3 tabular-nums font-mono">
                              {item.product ? formatINR(price) : '—'}
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
                        );
                      })}
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
