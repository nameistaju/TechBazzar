import React from 'react';
import { X, AlertTriangle, Image as ImageIcon, Trash2, Plus } from 'lucide-react';
import { formatINR } from '@shared/utils/formatters';

export default function ProductFormDrawer({
  isDrawerOpen,
  setIsDrawerOpen,
  editingId,
  form,
  setForm,
  drawerTab,
  setDrawerTab,
  handleSaveProduct,
  duplicateWarning,
  openEditDrawer,
  setShowImagePicker,
  calcMargin,
  savingProduct,
}) {
  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
              {editingId ? `Edit Product: ${form.name || form.sku}` : 'Add New Product'}
            </h2>
            <p className="text-xs text-[#6B6B6B] font-mono">
              {editingId ? `ID: ${editingId}` : 'Create a new catalog SKU with complete pricing, tax, specs, and media'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-[#EAEAEA] bg-[#F7F7F7] px-4 shrink-0 text-xs font-mono uppercase tracking-wider">
          {[
            { id: 'basic', label: '1. Basic' },
            { id: 'images', label: '2. Images' },
            { id: 'pricing', label: '3. Pricing & GST' },
            { id: 'inventory', label: '4. Inventory' },
            { id: 'specs', label: '5. Specs' },
            { id: 'variants', label: '6. Variants' },
            { id: 'flags', label: '7. Promotions' },
            { id: 'seo', label: '8. SEO' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDrawerTab(tab.id)}
              className={`py-3 px-4 border-b-2 font-semibold transition-colors whitespace-nowrap ${
                drawerTab === tab.id
                  ? 'border-accent text-[#0A0A0A] bg-white'
                  : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. BASIC INFO */}
          {drawerTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sony WH-1000XM5 Wireless Noise Canceling Headphones"
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none"
                  />
                  {duplicateWarning && (
                    <div className="mt-2 p-2.5 bg-accent-tint border border-accent/30 text-xs text-[#0A0A0A] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-accent-text shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-semibold text-accent-text">A similar product already exists: </span>
                        <span className="font-medium">{duplicateWarning.name}</span>
                        <span className="font-mono text-[#6B6B6B] ml-1">({duplicateWarning.sku})</span>
                        <button
                          type="button"
                          onClick={() => openEditDrawer(duplicateWarning.id)}
                          className="ml-2 text-accent-text underline font-semibold hover:text-[#0A0A0A]"
                        >
                          View Product →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder="e.g. Sony, boAt, Apple"
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none font-mono bg-white"
                  >
                    <option value="Earbuds">Earbuds</option>
                    <option value="Headphones">Headphones</option>
                    <option value="Smartwatches">Smartwatches</option>
                    <option value="Speakers">Speakers</option>
                    <option value="Smartphones">Smartphones</option>
                    <option value="Laptops">Laptops</option>
                    <option value="Power Banks">Power Banks</option>
                    <option value="Chargers and Cables">Chargers and Cables</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Cameras and CCTV">Cameras and CCTV</option>
                    <option value="Gaming">Gaming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    SKU (Stock Keeping Unit)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, sku: `TB-${form.category.slice(0,3).toUpperCase()}-${Math.floor(1000 + Math.random()*9000)}` })}
                      className="px-2.5 py-1 text-xs border border-[#EAEAEA] bg-gray-50 hover:bg-gray-100 font-mono"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Catalog Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none font-mono bg-white"
                  >
                    <option value="active">Active (Visible in Store)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    placeholder="Key highlights and product brief for storefront cards and quick view..."
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. IMAGES & VISUAL PICKER */}
          {drawerTab === 'images' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B]">
                    Assigned Media ({form.images?.length || 0}) • First image is primary
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(true)}
                    className="px-3 py-1.5 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase tracking-wider hover:bg-accent flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Open Local Media Library
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(form.images || []).map((img, idx) => (
                    <div key={idx} className="relative group border border-[#EAEAEA] bg-white p-2">
                      <img
                        src={img}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/images/placeholder-product.svg';
                        }}
                        className="w-full h-32 object-contain"
                      />
                      <div className="text-[10px] font-mono text-[#6B6B6B] truncate mt-1">
                        {img.split('/').pop()}
                      </div>
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 bg-accent text-black text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newImgs = form.images.filter((_, i) => i !== idx);
                          setForm({ ...form, images: newImgs, image: newImgs[0] || '' });
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual URL addition */}
              <div className="p-4 bg-gray-50 border border-[#EAEAEA]">
                <div className="text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-2">Or add path manually:</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/images/image-12.webp"
                    id="manualImgInput"
                    className="flex-1 px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = document.getElementById('manualImgInput').value.trim();
                      if (val) {
                        setForm({ ...form, images: [...form.images, val], image: form.images[0] || val });
                        document.getElementById('manualImgInput').value = '';
                      }
                    }}
                    className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase"
                  >
                    Add Path
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. PRICING & GST */}
          {drawerTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono font-bold focus:border-[#0A0A0A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    MRP / Strike Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value, originalPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono focus:border-[#0A0A0A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Cost Price (₹) (For profit analysis)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono focus:border-[#0A0A0A] outline-none"
                  />
                </div>
              </div>

              {/* Auto Calculated Profit & Margin Card */}
              <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] grid grid-cols-3 gap-4 font-mono text-center">
                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase">Estimated Discount</div>
                  <div className="text-sm font-bold text-accent-text mt-0.5">
                    {form.mrp && form.price ? Math.max(0, Math.round(((form.mrp - form.price) / form.mrp) * 100)) : 0}% OFF
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase">Gross Profit / Unit</div>
                  <div className="text-sm font-bold text-[#0A0A0A] mt-0.5">
                    {formatINR(Math.max(0, (Number(form.price) || 0) - (Number(form.costPrice) || 0)))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase">Profit Margin</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">
                    {calcMargin(Number(form.price), Number(form.costPrice))}%
                  </div>
                </div>
              </div>

              {/* GST & Taxation */}
              <div className="p-4 bg-white border border-[#EAEAEA] space-y-4">
                <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A]">
                  GST Configuration
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                      GST Rate Slab
                    </label>
                    <select
                      value={form.gstRate}
                      onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono bg-white outline-none"
                    >
                      <option value="0">0% (Nil / Exempt)</option>
                      <option value="5">5% (Cables & essentials)</option>
                      <option value="12">12% (Telecom equipment)</option>
                      <option value="18">18% (Standard Electronics)</option>
                      <option value="28">28% (Luxury / High Tier)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                      <input
                        type="checkbox"
                        checked={form.isTaxInclusive}
                        onChange={(e) => setForm({ ...form, isTaxInclusive: e.target.checked })}
                        className="accent-accent"
                      />
                      <span>Price is Inclusive of GST</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Wholesale Bulk Tier Pricing & MOQ Matrix */}
              <div className="p-4 bg-accent-tint border border-accent-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    Wholesale Tier Pricing & MOQ Matrix
                  </div>
                  <span className="text-[10px] font-mono text-accent-text font-bold">B2B VOLUME DISCOUNTS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                      Minimum Order Quantity (MOQ)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.moq}
                      onChange={(e) => setForm({ ...form, moq: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono bg-white outline-none focus:border-[#0A0A0A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                      Pack Step Size (Units / Master Carton)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.packSize}
                      onChange={(e) => setForm({ ...form, packSize: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono bg-white outline-none focus:border-[#0A0A0A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                      Tier 1: MOQ+ Price (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.tier1Price}
                      onChange={(e) => setForm({ ...form, tier1Price: e.target.value, price: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#EAEAEA] text-xs font-mono font-bold bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                      Tier 2: 50+ Units Price (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.tier2Price}
                      onChange={(e) => setForm({ ...form, tier2Price: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#EAEAEA] text-xs font-mono font-bold bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                      Tier 3: 100+ Units Price (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.tier3Price}
                      onChange={(e) => setForm({ ...form, tier3Price: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#EAEAEA] text-xs font-mono font-bold bg-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Suggested Retail Price (Reseller MSRP in ₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.suggestedRetailPrice}
                    onChange={(e) => setForm({ ...form, suggestedRetailPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono bg-white outline-none focus:border-[#0A0A0A]"
                  />
                </div>

                {/* Channel Availability Toggles */}
                <div className="pt-3 border-t border-accent-border flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="checkbox"
                      checked={form.isRetailAvailable !== false}
                      onChange={(e) => setForm({ ...form, isRetailAvailable: e.target.checked })}
                      className="accent-[#0A0A0A]"
                    />
                    <span>Available in Retail Catalog</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="checkbox"
                      checked={form.isWholesaleAvailable !== false}
                      onChange={(e) => setForm({ ...form, isWholesaleAvailable: e.target.checked })}
                      className="accent-accent"
                    />
                    <span>Available in Wholesale B2B</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 4. INVENTORY */}
          {drawerTab === 'inventory' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Current Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono font-bold focus:border-[#0A0A0A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm font-mono focus:border-[#0A0A0A] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Primary Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="e.g. Ingram Micro India, Redington, TechBazaar Direct"
                    className="w-full px-3 py-2 border border-[#EAEAEA] text-sm focus:border-[#0A0A0A] outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-[#EAEAEA] space-y-3 text-xs font-mono">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.trackInventory}
                    onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                    className="accent-accent"
                  />
                  <span>Track Inventory (Auto-decrement stock on checkout orders)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowBackorder}
                    onChange={(e) => setForm({ ...form, allowBackorder: e.target.checked })}
                    className="accent-accent"
                  />
                  <span>Allow Backorders when stock reaches zero</span>
                </label>
              </div>
            </div>
          )}

          {/* 5. SPECS */}
          {drawerTab === 'specs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B]">
                  Key-Value Technical Specifications
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, specRows: [...form.specRows, { key: '', value: '' }] })}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-xs font-mono flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Specification Row
                </button>
              </div>

              <div className="space-y-2">
                {form.specRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Specification (e.g. Battery Life)"
                      value={row.key}
                      onChange={(e) => {
                        const newRows = [...form.specRows];
                        newRows[idx].key = e.target.value;
                        setForm({ ...form, specRows: newRows });
                      }}
                      className="w-1/3 px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Up to 30 hours with ANC)"
                      value={row.value}
                      onChange={(e) => {
                        const newRows = [...form.specRows];
                        newRows[idx].value = e.target.value;
                        setForm({ ...form, specRows: newRows });
                      }}
                      className="flex-1 px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newRows = form.specRows.filter((_, i) => i !== idx);
                        setForm({ ...form, specRows: newRows.length ? newRows : [{ key: '', value: '' }] });
                      }}
                      className="p-1.5 text-neutral-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. VARIANTS */}
          {drawerTab === 'variants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A]">
                    Product Variants (Color, Storage, Size)
                  </h4>
                  <p className="text-[11px] text-[#6B6B6B]">Optional variant overrides for price and stock</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newV = [
                      ...(form.variants || []),
                      { name: 'Color: Midnight Black', sku: `${form.sku}-BLK`, price: form.price, stock: 10 }
                    ];
                    setForm({ ...form, variants: newV });
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-xs font-mono flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Variant
                </button>
              </div>

              <div className="space-y-2">
                {(form.variants || []).map((v, idx) => (
                  <div key={idx} className="p-3 border border-[#EAEAEA] bg-gray-50 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Variant Title (e.g. 128GB / Silver)"
                      value={v.name}
                      onChange={(e) => {
                        const updated = [...form.variants];
                        updated[idx].name = e.target.value;
                        setForm({ ...form, variants: updated });
                      }}
                      className="flex-1 px-2.5 py-1 border border-[#CCC] text-xs bg-white"
                    />
                    <input
                      type="text"
                      placeholder="SKU"
                      value={v.sku}
                      onChange={(e) => {
                        const updated = [...form.variants];
                        updated[idx].sku = e.target.value;
                        setForm({ ...form, variants: updated });
                      }}
                      className="w-28 px-2 py-1 border border-[#CCC] text-xs font-mono bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={v.price}
                      onChange={(e) => {
                        const updated = [...form.variants];
                        updated[idx].price = Number(e.target.value);
                        setForm({ ...form, variants: updated });
                      }}
                      className="w-24 px-2 py-1 border border-[#CCC] text-xs font-mono bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={v.stock}
                      onChange={(e) => {
                        const updated = [...form.variants];
                        updated[idx].stock = Number(e.target.value);
                        setForm({ ...form, variants: updated });
                      }}
                      className="w-20 px-2 py-1 border border-[#CCC] text-xs font-mono bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) })}
                      className="p-1 text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {(!form.variants || form.variants.length === 0) && (
                  <div className="py-6 text-center text-xs text-[#999] font-mono border border-dashed border-[#CCC]">
                    Single SKU product (no variants added).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. FLAGS & PROMOTIONS */}
          {drawerTab === 'flags' && (
            <div className="space-y-4">
              <div className="p-4 border border-[#EAEAEA] bg-white space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono font-bold">
                  <input
                    type="checkbox"
                    checked={form.isFlashSale}
                    onChange={(e) => setForm({ ...form, isFlashSale: e.target.checked })}
                    className="accent-accent"
                  />
                  <span>Mark as Flash Sale Deal</span>
                </label>

                {form.isFlashSale && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-2 border-t border-[#F0F0F0]">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                        Flash Sale Special Price (₹)
                      </label>
                      <input
                        type="number"
                        value={form.salePrice || ''}
                        onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                        placeholder="Sale price"
                        className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {[
                  { key: 'isTrending', label: 'Trending Showcase' },
                  { key: 'isBestseller', label: 'Bestseller Badge' },
                  { key: 'isNew', label: 'New Arrival Badge' },
                  { key: 'isRecommended', label: 'Recommended Grid' },
                  { key: 'featuredHero', label: 'Featured on Hero Banner' }
                ].map(fl => (
                  <label key={fl.key} className="p-3 border border-[#EAEAEA] flex items-center gap-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={Boolean(form[fl.key])}
                      onChange={(e) => setForm({ ...form, [fl.key]: e.target.checked })}
                      className="accent-accent"
                    />
                    <span>{fl.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 8. SEO */}
          {drawerTab === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={form.seo?.title || ''}
                  onChange={(e) => setForm({ ...form, seo: { ...form.seo, title: e.target.value } })}
                  placeholder={form.name}
                  className="w-full px-3 py-2 border border-[#EAEAEA] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6B6B] mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  value={form.seo?.description || ''}
                  onChange={(e) => setForm({ ...form, seo: { ...form.seo, description: e.target.value } })}
                  placeholder={form.shortDescription}
                  className="w-full px-3 py-2 border border-[#EAEAEA] text-xs"
                />
              </div>

              {/* Google Preview Snippet */}
              <div className="p-4 bg-gray-50 border border-[#EAEAEA] space-y-1">
                <div className="text-[10px] font-mono uppercase text-[#6B6B6B] mb-2">Google Snippet Preview:</div>
                <div className="text-xs text-[#202124]">https://techbazaar.in/product/{form.sku || 'sku'}</div>
                <div className="text-sm text-[#1a0dab] font-medium hover:underline cursor-pointer">
                  {form.seo?.title || form.name || 'Product Title'} | TechBazaar
                </div>
                <div className="text-xs text-[#4d5156] line-clamp-2">
                  {form.seo?.description || form.shortDescription || 'Buy high quality electronics and gadgets with free nationwide shipping.'}
                </div>
              </div>
            </div>
          )}

          {/* Drawer Bottom Controls */}
          <div className="pt-6 border-t border-[#EAEAEA] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 border border-[#EAEAEA] text-xs font-mono uppercase tracking-wider hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingProduct}
              className="px-6 py-2 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase tracking-wider hover:bg-accent transition-colors font-semibold"
            >
              {savingProduct ? 'Saving...' : (editingId ? 'Save Product Changes' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
