// src/components/admin/BannersView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Download, 
  ArrowUp, 
  ArrowDown, 
  Smartphone, 
  Monitor, 
  Layers, 
  RefreshCw,
  AlertTriangle,
  GripVertical,
  X
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import useToastStore from '@shared/store/toastStore';
import { useCategories, useProducts } from '@shared/hooks/useCatalog';
import BannerDrawerModal from '@features/admin/components/banners/BannerDrawerModal';
import BannerCropModal from '@features/admin/components/banners/BannerCropModal';

const SLOTS = [
  { id: 'home-mid-1', name: 'Home Mid 1', location: 'After Promo Tiles', page: 'Home' },
  { id: 'home-mid-2', name: 'Home Mid 2', location: 'Between Trending & Recommended', page: 'Home' },
  { id: 'home-mid-3', name: 'Home Mid 3', location: 'Before Membership Banner', page: 'Home' },
  { id: 'category-inline', name: 'Category Inline', location: 'Grid item #8 inline banner', page: 'Shop' },
  { id: 'cart-promo', name: 'Cart Promo', location: 'Top of Cart Drawer & Page', page: 'Cart' },
  { id: 'product-below', name: 'Product Below', location: 'Under Details & Specs', page: 'Product' }
];

export default function BannersView() {
  const addToast = useToastStore((s) => s.addToast);
  const { data: categories = [] } = useCategories();
  const { data: catalogData } = useProducts({ limit: 50 });
  const products = catalogData?.products || [];

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotFilter, setSelectedSlotFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Drawer & Crop State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' (1440) | 'tablet' (768) | 'mobile' (375)

  // Drawer Form State
  const [formData, setFormData] = useState({
    title: '',
    alt: '',
    slot: 'home-mid-1',
    label_pill: '',
    image_desktop: '',
    image_mobile: '',
    focal_x: 50,
    focal_y: 50,
    link_type: 'product',
    link_target: '',
    new_tab: false,
    starts_at: '',
    ends_at: '',
    priority: 0,
    is_active: 1
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [imageMeta, setImageMeta] = useState({ desktop: null, mobile: null });
  const [draggedBannerId, setDraggedBannerId] = useState(null);

  // Canvas Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropTargetDevice, setCropTargetDevice] = useState('desktop'); // 'desktop' (3:1) | 'mobile' (4:3)
  const [cropSourceImg, setCropSourceImg] = useState(null);
  const [uploadingCrop, setUploadingCrop] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [cropFocalPoint, setCropFocalPoint] = useState('center'); // 'top', 'center', 'bottom'
  const [showSafeZone, setShowSafeZone] = useState(true);
  const canvasRef = useRef(null);

  const hasUnsavedChanges = isDrawerOpen && initialFormData && JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const fetchBanners = async () => {
    setLoading(true);
    const res = await adminApi.getBanners();
    if (res.data?.banners) {
      setBanners(res.data.banners);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Filtered Banners
  const filteredBanners = banners.filter((b) => {
    const matchSlot = selectedSlotFilter === 'all' || b.slot === selectedSlotFilter;
    const matchSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.slot?.toLowerCase().includes(search.toLowerCase());
    return matchSlot && matchSearch;
  });

  const handleOpenAdd = (defaultSlot) => {
    setEditingBanner(null);
    const initial = {
      title: '',
      alt: '',
      slot: defaultSlot || (selectedSlotFilter !== 'all' ? selectedSlotFilter : 'home-mid-1'),
      audience: 'both',
      label_pill: '',
      image_desktop: '',
      image_mobile: '',
      focal_x: 50,
      focal_y: 50,
      link_type: 'category',
      link_target: 'Earbuds',
      new_tab: false,
      starts_at: '',
      ends_at: '',
      priority: 0,
      is_active: 1
    };
    setFormData(initial);
    setInitialFormData(initial);
    setFormErrors({});
    setImageMeta({ desktop: null, mobile: null });
    setPreviewDevice('desktop');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);
    const initial = {
      title: banner.title || '',
      alt: banner.alt || banner.title || '',
      slot: banner.slot || 'home-mid-1',
      audience: banner.audience || 'both',
      label_pill: banner.label_pill || banner.label || '',
      image_desktop: banner.image_desktop || banner.desktop_image || '',
      image_mobile: banner.image_mobile || banner.mobile_image || '',
      focal_x: banner.focal_x ?? 50,
      focal_y: banner.focal_y ?? 50,
      link_type: banner.link_type || 'none',
      link_target: banner.link_target || '',
      new_tab: !!banner.new_tab,
      starts_at: banner.starts_at ? banner.starts_at.slice(0, 16) : '',
      ends_at: banner.ends_at ? banner.ends_at.slice(0, 16) : '',
      priority: banner.priority ?? banner.sort_order ?? 0,
      is_active: banner.is_active ?? banner.active ?? 1
    };
    setFormData(initial);
    setInitialFormData(initial);
    setFormErrors({});
    setImageMeta({ desktop: null, mobile: null });
    setPreviewDevice('desktop');
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved changes to this banner?')) {
      return;
    }
    setIsDrawerOpen(false);
  };

  const handleToggle = async (banner) => {
    const currentActive = banner.is_active ?? banner.active ?? 1;
    const newStatus = currentActive ? 0 : 1;
    const res = await adminApi.toggleBanner(banner.id, newStatus);
    if (!res.error) {
      setBanners(banners.map(b => b.id === banner.id ? { ...b, is_active: newStatus, active: newStatus } : b));
      addToast(newStatus ? 'Banner activated' : 'Banner paused', 'success');
    }
  };

  const handleDelete = async (banner) => {
    const prevBanners = [...banners];
    setBanners(banners.filter(b => b.id !== banner.id));

    await adminApi.deleteBanner(banner.id);
    addToast(`Banner "${banner.title}" deleted. Click Undo to restore.`, 'warning', {
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: async () => {
          const restoreRes = await adminApi.createBanner({
            ...banner,
            desktop_image: banner.desktop_image || banner.image_desktop,
            mobile_image: banner.mobile_image || banner.image_mobile
          });
          if (!restoreRes.error) {
            await fetchBanners();
            addToast('Banner restored', 'success');
          } else {
            setBanners(prevBanners);
          }
        }
      }
    });
  };

  const handleDuplicate = async (banner) => {
    const desktopImg = banner.desktop_image || banner.image_desktop;
    const mobileImg = banner.mobile_image || banner.image_mobile || desktopImg;
    const copyPayload = {
      ...banner,
      desktop_image: desktopImg,
      image_desktop: desktopImg,
      mobile_image: mobileImg,
      image_mobile: mobileImg,
      title: `${banner.title} (Copy)`,
      id: undefined,
      impressions: 0,
      clicks: 0
    };
    const res = await adminApi.createBanner(copyPayload);
    if (res.data?.banner) {
      setBanners([...banners, {
        ...res.data.banner,
        image_desktop: res.data.banner.desktop_image,
        image_mobile: res.data.banner.mobile_image,
        is_active: res.data.banner.active,
        priority: res.data.banner.sort_order
      }]);
      addToast('Banner duplicated', 'success');
    }
  };

  const handleMoveOrder = async (banner, direction) => {
    const slotBanners = banners.filter(b => b.slot === banner.slot).sort((a, b) => ((a.priority ?? a.sort_order ?? 0) - (b.priority ?? b.sort_order ?? 0)));
    const idx = slotBanners.findIndex(b => b.id === banner.id);
    if (direction === 'up' && idx > 0) {
      const newIds = slotBanners.map(b => b.id);
      [newIds[idx], newIds[idx - 1]] = [newIds[idx - 1], newIds[idx]];
      await adminApi.reorderBanners(banner.slot, newIds);
      fetchBanners();
    } else if (direction === 'down' && idx < slotBanners.length - 1) {
      const newIds = slotBanners.map(b => b.id);
      [newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]];
      await adminApi.reorderBanners(banner.slot, newIds);
      fetchBanners();
    }
  };

  // Image Upload & Smart Ratio / Crop Handler
  const handleFileSelect = (e, deviceType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'image/svg+xml' || file.name?.toLowerCase().endsWith('.svg')) {
      addToast('SVG uploads are not allowed. Use JPG, PNG, or WebP.', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('File exceeds 5 MB maximum limit.', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    setCropTargetDevice(deviceType);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      // Try direct upload first; server validates magic bytes, converts with sharp, and returns 422 if outside 15% ratio
      const uploadRes = await adminApi.uploadBannerImage({
        base64: dataUrl,
        imageBase64: dataUrl,
        filename: file.name || `banner_${deviceType}.webp`,
        deviceType,
        type: deviceType
      });

      if (uploadRes.data?.url) {
        setFormData((prev) => ({
          ...prev,
          [deviceType === 'desktop' ? 'image_desktop' : 'image_mobile']: uploadRes.data.url
        }));
        setImageMeta((prev) => ({
          ...prev,
          [deviceType]: {
            width: uploadRes.data.width,
            height: uploadRes.data.height,
            size: uploadRes.data.size
          }
        }));
        addToast(`Uploaded ${deviceType} WebP (${uploadRes.data.width}×${uploadRes.data.height})`, 'success');
        return;
      }

      if (uploadRes.data?.cropNeeded || uploadRes.status === 422) {
        addToast(uploadRes.error || 'Image ratio differs by >15%. Opening crop tool.', 'info');
        const img = new Image();
        img.onload = () => {
          setCropSourceImg(img);
          setCropZoom(1);
          setCropPan({ x: 0, y: 0 });
          setCropFocalPoint('center');
          setCropModalOpen(true);
        };
        img.src = dataUrl;
        return;
      }

      addToast(uploadRes.error || 'Image upload failed', 'error');
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleOpenCropForExisting = (deviceType, imageUrl) => {
    if (!imageUrl) return;
    setCropTargetDevice(deviceType);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setCropSourceImg(img);
      setCropZoom(1);
      setCropPan({ x: 0, y: 0 });
      setCropFocalPoint('center');
      setCropModalOpen(true);
    };
    img.onerror = () => addToast('Could not load image for cropping.', 'error');
    img.src = imageUrl;
  };

  // Render crop preview on canvas
  useEffect(() => {
    if (!cropModalOpen || !cropSourceImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const isDesktop = cropTargetDevice === 'desktop';

    // Target dimensions: Desktop = 1800x600 (3:1), Mobile = 1200x900 (4:3)
    const targetW = isDesktop ? 1800 : 1200;
    const targetH = isDesktop ? 600 : 900;
    canvas.width = targetW;
    canvas.height = targetH;

    ctx.clearRect(0, 0, targetW, targetH);

    // Compute cover draw
    const scale = Math.max(targetW / cropSourceImg.width, targetH / cropSourceImg.height) * cropZoom;
    const scaledW = cropSourceImg.width * scale;
    const scaledH = cropSourceImg.height * scale;

    const posX = (targetW - scaledW) / 2 + cropPan.x * 2;
    let posY = (targetH - scaledH) / 2 + cropPan.y * 2;

    if (cropFocalPoint === 'top') posY = cropPan.y * 2;
    if (cropFocalPoint === 'bottom') posY = targetH - scaledH + cropPan.y * 2;

    ctx.drawImage(cropSourceImg, posX, posY, scaledW, scaledH);

    if (showSafeZone) {
      const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent-hex').trim() || '#FF4D00';
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(targetW * 0.1, targetH * 0.1, targetW * 0.8, targetH * 0.8);
      ctx.setLineDash([]);
    }
  }, [cropModalOpen, cropSourceImg, cropZoom, cropPan, cropFocalPoint, cropTargetDevice, showSafeZone]);

  const handleApplyCrop = async () => {
    if (!canvasRef.current) return;
    setUploadingCrop(true);
    const canvas = canvasRef.current;
    const base64 = canvas.toDataURL('image/webp', 0.92);

    const res = await adminApi.uploadBannerImage({
      base64,
      imageBase64: base64,
      filename: `banner_${cropTargetDevice}_${Date.now()}.webp`,
      deviceType: cropTargetDevice,
      type: cropTargetDevice,
      cropped: true,
      skipRatioCheck: true
    });
    setUploadingCrop(false);

    if (res.data?.url) {
      const focalY = cropFocalPoint === 'top' ? 15 : cropFocalPoint === 'bottom' ? 85 : 50;
      setFormData((prev) => ({
        ...prev,
        [cropTargetDevice === 'desktop' ? 'image_desktop' : 'image_mobile']: res.data.url,
        focal_x: 50,
        focal_y: focalY
      }));
      setImageMeta((prev) => ({
        ...prev,
        [cropTargetDevice]: {
          width: res.data.width,
          height: res.data.height,
          size: res.data.size
        }
      }));
      addToast(`Cropped & uploaded ${cropTargetDevice} WebP banner`, 'success');
      setCropModalOpen(false);
    } else {
      addToast(res.error || 'Upload failed', 'error');
    }
  };

  const handleSaveBanner = async (e) => {
    e?.preventDefault?.();
    const errors = {};
    if (!formData.slot) errors.slot = 'Target slot is required.';
    if (!formData.title?.trim()) errors.title = 'Campaign title is required.';
    if (!formData.alt?.trim()) errors.alt = 'Accessible alt text is required.';
    const desktopImg = formData.image_desktop?.trim();
    if (!desktopImg) errors.image_desktop = 'Desktop banner image is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('Please fill in all required banner fields.', 'error');
      return;
    }
    setFormErrors({});

    setSaving(true);
    const mobileImg = formData.image_mobile?.trim() || desktopImg;
    const payload = {
      title: formData.title.trim(),
      alt: formData.alt.trim(),
      slot: formData.slot,
      audience: formData.audience || 'both',
      label: formData.label_pill?.trim() || null,
      label_pill: formData.label_pill?.trim() || null,
      desktop_image: desktopImg,
      image_desktop: desktopImg,
      mobile_image: mobileImg,
      image_mobile: mobileImg,
      thumb: mobileImg || desktopImg,
      focal_x: Number(formData.focal_x ?? 50),
      focal_y: Number(formData.focal_y ?? 50),
      link_type: formData.link_type || 'none',
      link_target: formData.link_target || '',
      new_tab: formData.new_tab ? 1 : 0,
      priority: Number(formData.priority) || 0,
      sort_order: Number(formData.priority) || 0,
      starts_at: formData.starts_at || null,
      ends_at: formData.ends_at || null,
      active: formData.is_active ? 1 : 0,
      is_active: formData.is_active ? 1 : 0
    };

    let res;
    if (editingBanner) {
      res = await adminApi.updateBanner(editingBanner.id, payload);
    } else {
      res = await adminApi.createBanner(payload);
    }
    setSaving(false);

    if (!res.error) {
      addToast(editingBanner ? 'Banner updated successfully' : 'Banner created successfully', 'success');
      setIsDrawerOpen(false);
      fetchBanners();
    } else {
      addToast(res.error || 'Failed to save banner', 'error');
    }
  };

  const handleRowDrop = async (targetBanner) => {
    if (!draggedBannerId || draggedBannerId === targetBanner.id) return;
    const slotBanners = banners
      .filter((b) => b.slot === targetBanner.slot)
      .sort((a, b) => (a.priority ?? a.sort_order ?? 0) - (b.priority ?? b.sort_order ?? 0));
    const fromIdx = slotBanners.findIndex((b) => b.id === draggedBannerId);
    const toIdx = slotBanners.findIndex((b) => b.id === targetBanner.id);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...slotBanners];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await adminApi.reorderBanners(targetBanner.slot, reordered.map((b) => b.id));
    setDraggedBannerId(null);
    fetchBanners();
  };

  const unhealthyBanners = banners.filter((b) => b.media_health && !b.media_health.healthy);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent-text" />
            <h1 className="text-lg font-bold font-mono uppercase tracking-wider text-[#0A0A0A]">
              Banners & Ad Campaigns
            </h1>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1 font-mono">
            Administer dual responsive 3:1 (desktop) & 4:3 (mobile) promo slots with 50% visibility telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={adminApi.getExportBannersUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 border border-[#EAEAEA] hover:border-[#0A0A0A] bg-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} /> Export CSV
          </a>
          <button
            onClick={() => handleOpenAdd()}
            className="px-4 py-2 bg-[#0A0A0A] hover:bg-accent text-accent-contrast text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add New Banner
          </button>
        </div>
      </div>

      {/* Media Health Warning Banner */}
      {unhealthyBanners.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-center gap-2 rounded-[2px]">
          <AlertTriangle size={15} className="shrink-0" />
          <span>
            Media health warning: {unhealthyBanners.length} banner(s) reference missing image files on disk. Edit those banners to re-upload.
          </span>
        </div>
      )}

      {/* 1. VISUAL SLOT MAP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A]">
            Visual Slot Map (6 Active System Placements)
          </h2>
          <span className="text-[11px] font-mono text-[#8A8A8A]">
            Click any slot card to filter the campaign table below
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SLOTS.map((slot) => {
            const count = banners.filter(b => b.slot === slot.id && b.is_active).length;
            const isSelected = selectedSlotFilter === slot.id;

            return (
              <div
                key={slot.id}
                onClick={() => setSelectedSlotFilter(isSelected ? 'all' : slot.id)}
                className={`p-4 border rounded-[4px] bg-white transition-all cursor-pointer relative ${
                  isSelected 
                    ? 'border-[#0A0A0A] ring-2 ring-[#0A0A0A] shadow-md' 
                    : 'border-[#EAEAEA] hover:border-[#BDBDBD]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8A8A]">
                      {slot.page} Page
                    </span>
                    <h3 className="text-xs font-bold font-mono text-[#0A0A0A] uppercase mt-0.5">
                      {slot.name}
                    </h3>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    count > 0 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {count > 0 ? `${count} Active` : 'Empty (0)'}
                  </span>
                </div>

                <p className="text-[11px] text-[#6B6B6B] mb-3 leading-snug">
                  {slot.location}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#F2F2F2]">
                  <span className="text-[10px] font-mono text-[#8A8A8A]">
                    Slot ID: <strong className="text-[#0A0A0A]">{slot.id}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAdd(slot.id);
                    }}
                    className="text-[11px] font-mono font-bold text-accent-text hover:underline flex items-center gap-1"
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. BANNER PERFORMANCE TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[#0A0A0A]">
              Campaign Records ({filteredBanners.length})
            </h2>
            {selectedSlotFilter !== 'all' && (
              <button
                onClick={() => setSelectedSlotFilter('all')}
                className="text-[10px] font-mono bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-2 py-0.5 rounded flex items-center gap-1"
              >
                Clear Slot Filter ({selectedSlotFilter}) <X size={10} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by title or slot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono bg-white border border-[#EAEAEA] rounded-[4px] focus:outline-none focus:border-[#0A0A0A] w-52"
            />
            <button
              onClick={fetchBanners}
              className="p-1.5 border border-[#EAEAEA] hover:border-[#0A0A0A] bg-white rounded-[4px]"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-[4px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] text-[#6B6B6B] uppercase text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Banner</th>
                  <th className="py-2.5 px-3 font-semibold">Slot</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Format</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Order</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Impressions</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Clicks</th>
                  <th className="py-2.5 px-3 font-semibold text-right">CTR</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F2]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#8A8A8A]">
                      Loading campaign slots...
                    </td>
                  </tr>
                ) : filteredBanners.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#8A8A8A]">
                      No banners found matching query. Click "+ Add New Banner" to configure this slot.
                    </td>
                  </tr>
                ) : (
                  filteredBanners.map((banner) => {
                    const impressions = banner.impressions ?? banner.total_impressions ?? 0;
                    const clicks = banner.clicks ?? banner.total_clicks ?? 0;
                    const ctr = banner.ctr ?? (impressions > 0 
                      ? ((clicks / impressions) * 100).toFixed(1) 
                      : '0.0');
                    const isActive = !!(banner.is_active ?? banner.active ?? 1);
                    const bannerImg = banner.image_desktop || banner.desktop_image || banner.image_mobile || banner.mobile_image;
                    const label = banner.label_pill || banner.label;
                    const priority = banner.priority ?? banner.sort_order ?? 0;

                    return (
                      <tr
                        key={banner.id}
                        draggable
                        onDragStart={() => setDraggedBannerId(banner.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleRowDrop(banner)}
                        className="hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <GripVertical size={13} className="text-[#BDBDBD] cursor-grab shrink-0" title="Drag to reorder within slot" />
                            <div className="w-16 h-8 bg-[#F7F7F7] border border-[#EAEAEA] rounded overflow-hidden shrink-0 flex items-center justify-center">
                              {bannerImg ? (
                                <img
                                  src={bannerImg}
                                  alt={banner.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon size={14} className="text-[#8A8A8A]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#0A0A0A] truncate max-w-xs">
                                {banner.title}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {label && (
                                  <span className="inline-block bg-accent text-accent-contrast text-[9px] font-bold px-1.5 py-0.2 rounded">
                                    {label}
                                  </span>
                                )}
                                {banner.media_health && !banner.media_health.healthy && (
                                  <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                    <AlertTriangle size={9} /> Missing {banner.media_health.missing.join('/')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="bg-[#F2F2F2] text-[#0A0A0A] px-2 py-0.5 rounded text-[10px] font-semibold">
                            {banner.slot}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-[#6B6B6B]">
                            <Monitor size={12} title="Desktop 3:1" />
                            <span>/</span>
                            <Smartphone size={12} title="Mobile 4:3" />
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span className="font-bold">{priority}</span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => handleMoveOrder(banner, 'up')}
                                className="hover:text-accent-text p-0.5"
                                title="Move Up"
                              >
                                <ArrowUp size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveOrder(banner, 'down')}
                                className="hover:text-accent-text p-0.5"
                                title="Move Down"
                              >
                                <ArrowDown size={10} />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right tabular-nums">
                          {impressions.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 text-right tabular-nums font-bold">
                          {clicks.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 text-right tabular-nums text-emerald-700 font-bold">
                          {ctr}%
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle(banner)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                            }`}
                          >
                            {isActive ? 'Active' : 'Paused'}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(banner)}
                              className="p-1 hover:text-[#0A0A0A] text-[#6B6B6B]"
                              title="Edit Banner"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(banner)}
                              className="p-1 hover:text-[#0A0A0A] text-[#6B6B6B]"
                              title="Duplicate"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(banner)}
                              className="p-1 hover:text-red-600 text-[#6B6B6B]"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
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
      </div>

      <BannerDrawerModal
        isDrawerOpen={isDrawerOpen}
        handleCloseDrawer={handleCloseDrawer}
        editingBanner={editingBanner}
        handleSaveBanner={handleSaveBanner}
        formData={formData}
        setFormData={setFormData}
        SLOTS={SLOTS}
        handleFileSelect={handleFileSelect}
        handleOpenCropForExisting={handleOpenCropForExisting}
        imageMeta={imageMeta}
        formErrors={formErrors}
        hasUnsavedChanges={hasUnsavedChanges}
        previewDevice={previewDevice}
        setPreviewDevice={setPreviewDevice}
        categories={categories}
        products={products}
        saving={saving}
      />

      <BannerCropModal
        cropModalOpen={cropModalOpen}
        setCropModalOpen={setCropModalOpen}
        cropTargetDevice={cropTargetDevice}
        canvasRef={canvasRef}
        cropZoom={cropZoom}
        setCropZoom={setCropZoom}
        cropPan={cropPan}
        setCropPan={setCropPan}
        cropFocalPoint={cropFocalPoint}
        setCropFocalPoint={setCropFocalPoint}
        showSafeZone={showSafeZone}
        setShowSafeZone={setShowSafeZone}
        handleApplyCrop={handleApplyCrop}
        uploadingCrop={uploadingCrop}
      />
    </div>
  );
}
