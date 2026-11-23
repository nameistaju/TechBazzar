// src/components/admin/ProductsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Copy, 
  Trash2, 
  RotateCcw, 
  Download, 
  Upload, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  AlertTriangle,
  Image as ImageIcon,
  Tag,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { formatINR } from '../../utils/formatters';
import useToastStore from '../../store/toastStore';

export default function ProductsView({ initialEditId, onClearInitialEdit }) {
  const addToast = useToastStore((s) => s.addToast);

  // Table State
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [flagFilter, setFlagFilter] = useState('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [sortField, setSortField] = useState('created_at_desc');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);

  // Column Visibility
  const [visibleCols, setVisibleCols] = useState({
    sku: true,
    category: true,
    price: true,
    margin: true,
    stock: true,
    status: true,
    flags: true,
    actions: true
  });
  const [showColPicker, setShowColPicker] = useState(false);

  // Drawer (Add / Edit) State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('basic'); // basic, images, pricing, inventory, specs, variants, flags, seo
  const [editingId, setEditingId] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Local Image Gallery Picker
  const [availableImages, setAvailableImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerSearch, setImagePickerSearch] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: 'Earbuds',
    sku: '',
    shortDescription: '',
    image: '/images/image-1.webp',
    images: ['/images/image-1.webp'],
    price: 999,
    originalPrice: 1499,
    costPrice: 650,
    mrp: 1499,
    gstRate: 18,
    isTaxInclusive: true,
    stock: 20,
    lowStockThreshold: 3,
    trackInventory: true,
    allowBackorder: false,
    supplier: 'TechBazaar Direct',
    status: 'active',
    specs: {},
    specRows: [{ key: '', value: '' }],
    variants: [],
    tags: [],
    isFlashSale: false,
    salePrice: '',
    isTrending: false,
    isBestseller: false,
    isNew: false,
    isRecommended: false,
    featuredHero: false,
    seo: { title: '', description: '' }
  });

  // Load Products
  const loadProducts = async () => {
    setLoading(true);
    const res = await adminApi.getProducts({
      search,
      category: categoryFilter,
      status: statusFilter,
      stockLevel: stockFilter,
      flag: flagFilter !== 'all' ? flagFilter : undefined,
      includeDeleted: includeDeleted ? 'true' : 'false',
      sort: sortField,
      limit: 100
    });

    if (res.data?.products) {
      setProducts(res.data.products);
      setTotal(res.data.total || res.data.products.length);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, statusFilter, stockFilter, flagFilter, includeDeleted, sortField]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Image Library on mount
  useEffect(() => {
    adminApi.getImages().then(res => {
      if (res.data?.images) setAvailableImages(res.data.images);
    }).catch(() => {});
  }, []);

  // Open Edit if passed via initialEditId
  useEffect(() => {
    if (initialEditId) {
      openEditDrawer(initialEditId);
      if (onClearInitialEdit) onClearInitialEdit();
    }
  }, [initialEditId]);

  // Open Add Product Drawer
  const openAddDrawer = () => {
    setEditingId(null);
    setDrawerTab('basic');
    setForm({
      name: '',
      brand: 'TechBazaar',
      category: 'Earbuds',
      sku: `TB-EAR-${Math.floor(1000 + Math.random() * 9000)}`,
      shortDescription: '',
      image: availableImages[0]?.path || '/images/image-1.webp',
      images: [availableImages[0]?.path || '/images/image-1.webp'],
      price: 1299,
      originalPrice: 1999,
      costPrice: 850,
      mrp: 1999,
      gstRate: 18,
      isTaxInclusive: true,
      stock: 25,
      lowStockThreshold: 3,
      trackInventory: true,
      allowBackorder: false,
      supplier: 'TechBazaar Direct',
      status: 'active',
      specs: {},
      specRows: [{ key: 'Connectivity', value: 'Bluetooth 5.3' }],
      variants: [],
      tags: ['Wireless', 'Popular'],
      isFlashSale: false,
      salePrice: '',
      isTrending: true,
      isBestseller: false,
      isNew: true,
      isRecommended: false,
      featuredHero: false,
      seo: { title: '', description: '' }
    });
    setIsDrawerOpen(true);
  };

  // Open Edit Product Drawer
  const openEditDrawer = async (id) => {
    setLoading(true);
    const res = await adminApi.getProduct(id);
    setLoading(false);

    if (res.data?.product) {
      const p = res.data.product;
      setEditingId(p.id);
      setDrawerTab('basic');

      // Convert specs object to key-value rows
      const specRows = Object.entries(p.specs || {}).map(([key, value]) => ({ key, value }));
      if (specRows.length === 0) specRows.push({ key: '', value: '' });

      setForm({
        ...p,
        costPrice: p.costPrice || Math.round(p.price * 0.65),
        mrp: p.mrp || p.originalPrice || Math.round(p.price * 1.25),
        images: p.images && p.images.length > 0 ? p.images : [p.image],
        specRows,
        seo: p.seo || { title: p.name, description: p.shortDescription || '' }
      });
      setIsDrawerOpen(true);
    }
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      addToast({ type: 'error', message: 'Name and price are required.' });
      return;
    }

    setSavingProduct(true);

    // Convert specRows to object
    const specsObj = {};
    form.specRows.forEach(r => {
      if (r.key.trim()) specsObj[r.key.trim()] = r.value.trim();
    });

    const payload = {
      ...form,
      specs: specsObj,
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      mrp: Number(form.mrp),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      gstRate: Number(form.gstRate),
      salePrice: form.salePrice ? Number(form.salePrice) : null,
      image: form.images[0] || form.image
    };

    let res;
    if (editingId) {
      res = await adminApi.updateProduct(editingId, payload);
    } else {
      res = await adminApi.createProduct(payload);
    }

    setSavingProduct(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: editingId ? 'Product updated successfully' : 'Product created successfully' });
      setIsDrawerOpen(false);
      loadProducts();
    }
  };

  // Duplicate Product
  const handleDuplicate = async (id) => {
    const res = await adminApi.duplicateProduct(id);
    if (res.data?.id) {
      addToast({ type: 'success', message: 'Product duplicated as draft.' });
      loadProducts();
    }
  };

  // Soft Delete / Archive
  const handleDelete = async (id, name) => {
    if (window.confirm(`Archive "${name}"? It will be removed from storefront view.`)) {
      const res = await adminApi.deleteProduct(id);
      if (!res.error) {
        addToast({ type: 'info', message: 'Product archived.' });
        loadProducts();
      }
    }
  };

  // Restore Product
  const handleRestore = async (id) => {
    const res = await adminApi.restoreProduct(id);
    if (!res.error) {
      addToast({ type: 'success', message: 'Product restored to active status.' });
      loadProducts();
    }
  };

  // Bulk Actions
  const handleApplyBulk = async () => {
    if (selectedIds.length === 0 || !bulkAction) return;

    setApplyingBulk(true);
    let val = bulkValue;
    if (bulkAction === 'mark_flag') {
      val = { flag: bulkValue, enabled: true };
    }

    const res = await adminApi.bulkAction({
      ids: selectedIds,
      action: bulkAction,
      value: val
    });

    setApplyingBulk(false);
    if (!res.error) {
      addToast({ type: 'success', message: `Bulk action applied to ${res.data?.affectedCount || selectedIds.length} items.` });
      setSelectedIds([]);
      setBulkAction('');
      setBulkValue('');
      loadProducts();
    }
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Margin calculation helper
  const calcMargin = (price, cost) => {
    if (!price || !cost || price <= 0) return 0;
    return Math.round(((price - cost) / price) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Product Catalog
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            {total} total items • Manage pricing, inventory thresholds, specifications, and media
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={adminApi.getExportProductsUrl()}
            download
            className="px-3 py-1.5 border border-[#EAEAEA] bg-white text-xs font-mono uppercase tracking-wider text-[#0A0A0A] hover:border-[#0A0A0A] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>

          <button
            onClick={openAddDrawer}
            className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-[#EAEAEA] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B6B6B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, brand, SKU..."
              className="w-full pl-9 pr-3 py-1.5 border border-[#EAEAEA] text-xs focus:border-[#0A0A0A] outline-none"
            />
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#EAEAEA] text-xs outline-none bg-white font-mono"
          >
            <option value="all">All Categories</option>
            <option value="Earbuds">Earbuds</option>
            <option value="Headphones">Headphones</option>
            <option value="Smartwatches">Smartwatches</option>
            <option value="Speakers">Speakers</option>
            <option value="Smartphones">Smartphones</option>
            <option value="Laptops">Laptops</option>
            <option value="Power Banks">Power Banks</option>
            <option value="Chargers and Cables">Chargers & Cables</option>
            <option value="Accessories">Accessories</option>
            <option value="Cameras and CCTV">Cameras & CCTV</option>
            <option value="Gaming">Gaming</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#EAEAEA] text-xs outline-none bg-white font-mono"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {/* Stock Level */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#EAEAEA] text-xs outline-none bg-white font-mono"
          >
            <option value="all">All Stock Levels</option>
            <option value="in">In Stock (&gt;3)</option>
            <option value="low">Low Stock (1-3)</option>
            <option value="out">Out of Stock (0)</option>
          </select>
        </div>

        {/* Secondary Bar: Column Toggle & Archive Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0] text-xs font-mono text-[#6B6B6B]">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="accent-[#FF4D00]"
              />
              Show Archived Products
            </label>

            {/* Flag Filter Pills */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span>Flags:</span>
              {['all', 'flashSale', 'trending', 'bestseller', 'new'].map(fl => (
                <button
                  key={fl}
                  onClick={() => setFlagFilter(fl)}
                  className={`px-2 py-0.5 text-[10px] uppercase border ${
                    flagFilter === fl ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-[#EAEAEA] hover:border-[#6B6B6B]'
                  }`}
                >
                  {fl}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className="flex items-center gap-1.5 px-2 py-1 border border-[#EAEAEA] hover:border-[#0A0A0A]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Columns
            </button>

            {showColPicker && (
              <div className="absolute right-0 top-8 w-44 bg-white border border-[#0A0A0A] p-2 shadow-xl z-20 space-y-1.5 text-xs">
                {Object.keys(visibleCols).map(col => (
                  <label key={col} className="flex items-center justify-between p-1 hover:bg-[#F7F7F7] cursor-pointer">
                    <span className="capitalize">{col}</span>
                    <input
                      type="checkbox"
                      checked={visibleCols[col]}
                      onChange={(e) => setVisibleCols(prev => ({ ...prev, [col]: e.target.checked }))}
                      className="accent-[#FF4D00]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when rows selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-[#0A0A0A] text-white flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="bg-[#FF4D00] text-black font-bold px-2 py-0.5">{selectedIds.length} Selected</span>
            <span>Bulk Actions:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => { setBulkAction(e.target.value); setBulkValue(''); }}
              className="bg-neutral-800 border border-neutral-700 text-white px-2 py-1 outline-none text-xs"
            >
              <option value="">Select Action...</option>
              <option value="set_status">Set Status</option>
              <option value="set_category">Change Category</option>
              <option value="adjust_price_percent">Adjust Price (%)</option>
              <option value="adjust_price_amount">Adjust Price (₹ Amount)</option>
              <option value="mark_flag">Set Flag</option>
              <option value="delete">Archive Products</option>
            </select>

            {bulkAction === 'set_status' && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white px-2 py-1 outline-none text-xs"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            )}

            {bulkAction === 'set_category' && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white px-2 py-1 outline-none text-xs"
              >
                <option value="Earbuds">Earbuds</option>
                <option value="Headphones">Headphones</option>
                <option value="Smartwatches">Smartwatches</option>
                <option value="Speakers">Speakers</option>
                <option value="Smartphones">Smartphones</option>
                <option value="Accessories">Accessories</option>
              </select>
            )}

            {(bulkAction === 'adjust_price_percent' || bulkAction === 'adjust_price_amount') && (
              <input
                type="number"
                placeholder={bulkAction === 'adjust_price_percent' ? "+10 or -10%" : "+50 or -50"}
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white px-2 py-1 w-28 outline-none text-xs font-mono"
              />
            )}

            {bulkAction === 'mark_flag' && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white px-2 py-1 outline-none text-xs"
              >
                <option value="flashSale">Flash Sale</option>
                <option value="trending">Trending</option>
                <option value="bestseller">Bestseller</option>
                <option value="new">New Arrival</option>
                <option value="recommended">Recommended</option>
              </select>
            )}

            <button
              onClick={handleApplyBulk}
              disabled={applyingBulk || !bulkAction}
              className="px-3 py-1 bg-[#FF4D00] text-black font-bold uppercase hover:bg-white transition-colors"
            >
              {applyingBulk ? 'Applying...' : 'Apply'}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 hover:text-[#FF4D00]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Products Table */}
      <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.length === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-[#FF4D00]"
                />
              </th>
              <th className="p-3">Product</th>
              {visibleCols.sku && <th className="p-3">SKU</th>}
              {visibleCols.category && <th className="p-3">Category</th>}
              {visibleCols.price && <th className="p-3 text-right">Selling / MRP</th>}
              {visibleCols.margin && <th className="p-3 text-center">Margin</th>}
              {visibleCols.stock && <th className="p-3 text-center">Stock</th>}
              {visibleCols.status && <th className="p-3 text-center">Status</th>}
              {visibleCols.flags && <th className="p-3">Promotions</th>}
              {visibleCols.actions && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {loading && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                  <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
                  Loading Catalog Database...
                </td>
              </tr>
            )}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-xs text-[#6B6B6B]">
                  No products matched the current filters.
                </td>
              </tr>
            )}

            {!loading && products.map(p => {
              const isSelected = selectedIds.includes(p.id);
              const margin = calcMargin(p.price, p.costPrice);

              return (
                <tr 
                  key={p.id} 
                  className={`hover:bg-[#FBFBFB] transition-colors ${isSelected ? 'bg-orange-50/40' : ''} ${p.deletedAt ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                      className="accent-[#FF4D00]"
                    />
                  </td>

                  {/* Thumbnail & Name */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-10 h-10 object-contain bg-white border border-[#EAEAEA] p-0.5 shrink-0"
                      />
                      <div>
                        <div className="font-semibold text-[#0A0A0A] line-clamp-1">{p.name}</div>
                        <div className="text-[11px] text-[#6B6B6B]">{p.brand}</div>
                      </div>
                    </div>
                  </td>

                  {/* SKU */}
                  {visibleCols.sku && (
                    <td className="p-3 font-mono text-[#6B6B6B]">
                      {p.sku || p.id}
                    </td>
                  )}

                  {/* Category */}
                  {visibleCols.category && (
                    <td className="p-3 capitalize font-mono text-[#444]">
                      {p.category}
                    </td>
                  )}

                  {/* Price & MRP */}
                  {visibleCols.price && (
                    <td className="p-3 text-right font-mono">
                      <div className="font-bold text-[#0A0A0A]">{formatINR(p.price)}</div>
                      {p.mrp && p.mrp > p.price && (
                        <div className="text-[10px] text-[#999] line-through">{formatINR(p.mrp)}</div>
                      )}
                    </td>
                  )}

                  {/* Margin % */}
                  {visibleCols.margin && (
                    <td className="p-3 text-center font-mono">
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold ${margin >= 40 ? 'text-emerald-700 bg-emerald-50' : 'text-[#6B6B6B] bg-gray-100'}`}>
                        {margin}%
                      </span>
                    </td>
                  )}

                  {/* Stock */}
                  {visibleCols.stock && (
                    <td className="p-3 text-center font-mono">
                      <span className={`inline-block px-2 py-0.5 font-bold ${
                        p.stock === 0 
                          ? 'bg-red-100 text-red-600' 
                          : p.stock <= (p.lowStockThreshold || 3)
                          ? 'bg-orange-100 text-[#FF4D00]'
                          : 'text-[#0A0A0A]'
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                  )}

                  {/* Status */}
                  {visibleCols.status && (
                    <td className="p-3 text-center font-mono">
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 font-semibold ${
                        p.status === 'active' 
                          ? 'bg-black text-white' 
                          : p.status === 'draft'
                          ? 'bg-neutral-200 text-[#6B6B6B]'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  )}

                  {/* Flags */}
                  {visibleCols.flags && (
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {p.isFlashSale && <span className="px-1.5 py-0.2 bg-[#FF4D00] text-black text-[9px] font-mono font-bold uppercase">Sale</span>}
                        {p.isTrending && <span className="px-1.5 py-0.2 bg-black text-white text-[9px] font-mono uppercase">Trend</span>}
                        {p.isBestseller && <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-mono uppercase">Top</span>}
                        {p.isNew && <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[9px] font-mono uppercase">New</span>}
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  {visibleCols.actions && (
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditDrawer(p.id)}
                          title="Edit Product"
                          className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-gray-100 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(p.id)}
                          title="Duplicate as Draft"
                          className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-gray-100 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {p.deletedAt ? (
                          <button
                            onClick={() => handleRestore(p.id)}
                            title="Restore Product"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Archive Product"
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 9-SECTION PRODUCT DRAWER (ADD / EDIT) */}
      {/* ======================================================== */}
      {isDrawerOpen && (
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
                      ? 'border-[#FF4D00] text-[#0A0A0A] bg-white'
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
                        className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Open Local Media Library
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(form.images || []).map((img, idx) => (
                        <div key={idx} className="relative group border border-[#EAEAEA] bg-white p-2">
                          <img src={img} alt="" className="w-full h-32 object-contain" />
                          <div className="text-[10px] font-mono text-[#6B6B6B] truncate mt-1">
                            {img.split('/').pop()}
                          </div>
                          {idx === 0 && (
                            <span className="absolute top-2 left-2 bg-[#FF4D00] text-black text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase">
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
                      <div className="text-sm font-bold text-[#FF4D00] mt-0.5">
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
                            className="accent-[#FF4D00]"
                          />
                          <span>Price is Inclusive of GST</span>
                        </label>
                      </div>
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
                        className="accent-[#FF4D00]"
                      />
                      <span>Track Inventory (Auto-decrement stock on checkout orders)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.allowBackorder}
                        onChange={(e) => setForm({ ...form, allowBackorder: e.target.checked })}
                        className="accent-[#FF4D00]"
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
                        className="accent-[#FF4D00]"
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
                          className="accent-[#FF4D00]"
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
                  className="px-6 py-2 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] transition-colors font-semibold"
                >
                  {savingProduct ? 'Saving...' : (editingId ? 'Save Product Changes' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LOCAL IMAGE GALLERY MODAL */}
      {/* ======================================================== */}
      {showImagePicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white border border-[#0A0A0A] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-[#EAEAEA] flex items-center justify-between bg-white">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  Select from /public/images ({availableImages.length} items)
                </h3>
                <p className="text-[11px] text-[#6B6B6B]">Click an image to add it to this product's gallery</p>
              </div>
              <button onClick={() => setShowImagePicker(false)} className="p-1">
                <X className="w-5 h-5 text-[#6B6B6B]" />
              </button>
            </div>

            <div className="p-3 border-b border-[#EAEAEA] bg-gray-50">
              <input
                type="text"
                placeholder="Filter by image filename..."
                value={imagePickerSearch}
                onChange={(e) => setImagePickerSearch(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#CCC] text-xs bg-white"
              />
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-6 gap-3">
              {availableImages
                .filter(img => img.filename.toLowerCase().includes(imagePickerSearch.toLowerCase()))
                .map((img) => {
                  const isAssigned = form.images?.includes(img.path);
                  return (
                    <div
                      key={img.filename}
                      onClick={() => {
                        if (isAssigned) {
                          setForm({ ...form, images: form.images.filter(x => x !== img.path) });
                        } else {
                          const updated = [...(form.images || []), img.path];
                          setForm({ ...form, images: updated, image: updated[0] });
                        }
                      }}
                      className={`p-2 border cursor-pointer hover:border-[#0A0A0A] transition-all relative ${
                        isAssigned ? 'border-[#FF4D00] bg-orange-50/50' : 'border-[#EAEAEA] bg-white'
                      }`}
                    >
                      <img src={img.path} alt="" className="w-full h-16 object-contain" />
                      <div className="text-[10px] font-mono text-[#6B6B6B] truncate mt-1 text-center">
                        {img.filename}
                      </div>
                      {isAssigned && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-[#FF4D00] text-black rounded-full flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="p-3 border-t border-[#EAEAEA] bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowImagePicker(false)}
                className="px-4 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase"
              >
                Done Selecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
