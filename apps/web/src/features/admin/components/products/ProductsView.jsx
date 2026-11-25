// src/components/admin/ProductsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Copy, 
  Trash2, 
  RotateCcw, 
  Download, 
  X, 
  Sparkles, 
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import productsApi from '@shared/api/productsApi';
import { formatINR } from '@shared/utils/formatters';
import useToastStore from '@shared/store/toastStore';
import ProductFormDrawer from '@features/admin/components/products/ProductFormDrawer';
import ProductImagePickerModal from '@features/admin/components/products/ProductImagePickerModal';
import ProductDuplicatesModal from '@features/admin/components/products/ProductDuplicatesModal';

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
  const [sortField, _setSortField] = useState('created_at_desc');

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

  // Duplicate Products Review Tooling
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [mergingGroupId, setMergingGroupId] = useState(null);
  const [mergingAll, setMergingAll] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [dismissedGroupKeys, setDismissedGroupKeys] = useState(new Set());

  // Form State
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: 'Earbuds',
    sku: '',
    shortDescription: '',
    image: '/images/image-151.webp',
    images: ['/images/image-151.webp'],
    price: 999,
    originalPrice: 1499,
    costPrice: 650,
    mrp: 1499,
    moq: 10,
    packSize: 5,
    tier1Price: 999,
    tier2Price: 920,
    tier3Price: 850,
    suggestedRetailPrice: 1499,
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
    loadDuplicateGroups();
  }, []);

  const loadDuplicateGroups = async () => {
    setLoadingDuplicates(true);
    try {
      const res = await adminApi.getDuplicateGroups();
      if (res.data?.groups) {
        setDuplicateGroups(res.data.groups);
      }
    } catch {} finally {
      setLoadingDuplicates(false);
    }
  };

  // Real-time similarity check on name typing in Add/Edit Drawer
  useEffect(() => {
    if (!isDrawerOpen || !form.name || form.name.trim().length < 3) {
      setDuplicateWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await productsApi.checkDuplicate({
          name: form.name.trim(),
          brand: form.brand?.trim(),
          excludeId: editingId
        });
        if (res.data?.exists && res.data?.matches?.length > 0) {
          setDuplicateWarning(res.data.matches[0]);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.name, form.brand, editingId, isDrawerOpen]);

  const handleMergeGroup = async (canonicalId, duplicateIds) => {
    setMergingGroupId(canonicalId);
    try {
      const res = await adminApi.mergeProductGroup(canonicalId, duplicateIds);
      if (res.error) {
        addToast({ type: 'error', message: res.error });
      } else {
        addToast({
          type: 'success',
          message: res.data?.message || `Merged ${duplicateIds.length} duplicate(s) into canonical product. Undoable from Activity Log.`
        });
        loadProducts();
        loadDuplicateGroups();
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to merge products.' });
    } finally {
      setMergingGroupId(null);
    }
  };

  const handleMergeAllSafeGroups = async () => {
    if (!window.confirm('Merge all safe duplicate product groups into their canonical records? Image galleries and color variants will be consolidated.')) {
      return;
    }
    setMergingAll(true);
    try {
      const res = await adminApi.mergeAllDuplicateGroups();
      if (res.error) {
        addToast({ type: 'error', message: res.error });
      } else {
        addToast({
          type: 'success',
          message: `Successfully merged ${res.data?.mergedProductsCount || 0} duplicate products across ${res.data?.mergedGroupsCount || 0} groups.`
        });
        loadProducts();
        loadDuplicateGroups();
        setShowDuplicatesModal(false);
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to merge all groups.' });
    } finally {
      setMergingAll(false);
    }
  };

  const handleDismissGroup = (key) => {
    setDismissedGroupKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

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
      image: availableImages[0]?.path || '/images/image-151.webp',
      images: [availableImages[0]?.path || '/images/image-151.webp'],
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
        moq: p.moq || p.wholesale_moq || 10,
        packSize: p.pack_size || p.packSize || 5,
        tier1Price: p.tier1_price || p.tier1Price || p.price || 999,
        tier2Price: p.tier2_price || p.tier2Price || Math.round((p.price || 999) * 0.92),
        tier3Price: p.tier3_price || p.tier3Price || Math.round((p.price || 999) * 0.85),
        suggestedRetailPrice: p.suggested_retail_price || p.suggestedRetailPrice || p.mrp || Math.round(p.price * 1.3),
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
      moq: Number(form.moq) || 1,
      pack_size: Number(form.packSize) || 1,
      tier1_price: Number(form.tier1Price) || Number(form.price),
      tier2_price: Number(form.tier2Price) || Math.round(Number(form.price) * 0.92),
      tier3_price: Number(form.tier3Price) || Math.round(Number(form.price) * 0.85),
      suggested_retail_price: Number(form.suggestedRetailPrice) || Number(form.mrp),
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
          <button
            onClick={() => {
              loadDuplicateGroups();
              setShowDuplicatesModal(true);
            }}
            className="px-3 py-1.5 border border-[#EAEAEA] bg-white text-xs font-mono uppercase tracking-wider text-[#0A0A0A] hover:border-accent hover:text-accent-text flex items-center gap-1.5 transition-colors relative"
            title="Scan catalog for duplicate products"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-text" />
            Find Duplicates
            {duplicateGroups.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-accent text-accent-contrast rounded text-[10px] font-bold">
                {duplicateGroups.length}
              </span>
            )}
          </button>

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
            className="px-3 py-1.5 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase tracking-wider hover:bg-accent flex items-center gap-1.5 transition-colors font-semibold"
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
                className="accent-accent"
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
                      className="accent-accent"
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
            <span className="bg-accent text-black font-bold px-2 py-0.5">{selectedIds.length} Selected</span>
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
              className="px-3 py-1 bg-accent text-black font-bold uppercase hover:bg-white transition-colors"
            >
              {applyingBulk ? 'Applying...' : 'Apply'}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 hover:text-accent-text"
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
                  className="accent-accent"
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
                  className={`hover:bg-[#FBFBFB] transition-colors ${isSelected ? 'bg-accent-tint' : ''} ${p.deletedAt ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                      className="accent-accent"
                    />
                  </td>

                  {/* Thumbnail & Name */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || '/images/placeholder-product.svg'}
                        alt={p.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/images/placeholder-product.svg';
                        }}
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
                          ? 'bg-accent-tint text-accent-text'
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
                        {p.isFlashSale && <span className="px-1.5 py-0.2 bg-accent text-black text-[9px] font-mono font-bold uppercase">Sale</span>}
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

      <ProductFormDrawer
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        editingId={editingId}
        form={form}
        setForm={setForm}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        handleSaveProduct={handleSaveProduct}
        duplicateWarning={duplicateWarning}
        openEditDrawer={openEditDrawer}
        setShowImagePicker={setShowImagePicker}
        calcMargin={calcMargin}
        savingProduct={savingProduct}
      />

      <ProductImagePickerModal
        showImagePicker={showImagePicker}
        setShowImagePicker={setShowImagePicker}
        availableImages={availableImages}
        imagePickerSearch={imagePickerSearch}
        setImagePickerSearch={setImagePickerSearch}
        form={form}
        setForm={setForm}
      />

      <ProductDuplicatesModal
        showDuplicatesModal={showDuplicatesModal}
        setShowDuplicatesModal={setShowDuplicatesModal}
        duplicateGroups={duplicateGroups}
        dismissedGroupKeys={dismissedGroupKeys}
        setDismissedGroupKeys={setDismissedGroupKeys}
        handleMergeAllSafeGroups={handleMergeAllSafeGroups}
        mergingAll={mergingAll}
        loadingDuplicates={loadingDuplicates}
        loadDuplicateGroups={loadDuplicateGroups}
        handleDismissGroup={handleDismissGroup}
        mergingGroupId={mergingGroupId}
        handleMergeGroup={handleMergeGroup}
      />
    </div>
  );
}
