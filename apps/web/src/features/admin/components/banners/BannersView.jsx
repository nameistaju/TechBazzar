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
  RefreshCw
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
    slot: 'home-mid-1',
    label_pill: '',
    image_desktop: '',
    image_mobile: '',
    link_type: 'product',
    link_target: '',
    new_tab: false,
    starts_at: '',
    ends_at: '',
    priority: 0,
    is_active: 1
  });

  // Canvas Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropTargetDevice, setCropTargetDevice] = useState('desktop'); // 'desktop' (3:1) | 'mobile' (4:3)
  const [cropSourceImg, setCropSourceImg] = useState(null);
  const [rawSourceDataUrl, setRawSourceDataUrl] = useState(null);
  const [rawSourceExt, setRawSourceExt] = useState('png');
  const [uploadingCrop, setUploadingCrop] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [cropFocalPoint, setCropFocalPoint] = useState('center'); // 'top', 'center', 'bottom'
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

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
    setFormData({
      title: '',
      slot: defaultSlot || (selectedSlotFilter !== 'all' ? selectedSlotFilter : 'home-mid-1'),
      audience: 'both',
      label_pill: '',
      image_desktop: '/uploads/banners/Festive Bulk Deals Banner.png',
      image_mobile: '/uploads/banners/Festive Bulk Deals Banner.png',
      link_type: 'category',
      link_target: 'smartphones',
      new_tab: false,
      starts_at: '',
      ends_at: '',
      priority: 0,
      is_active: 1
    });
    setPreviewDevice('desktop');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      slot: banner.slot || 'home-mid-1',
      audience: banner.audience || 'both',
      label_pill: banner.label_pill || banner.label || '',
      image_desktop: banner.image_desktop || banner.desktop_image || '',
      image_mobile: banner.image_mobile || banner.mobile_image || '',
      link_type: banner.link_type || 'none',
      link_target: banner.link_target || '',
      new_tab: !!banner.new_tab,
      starts_at: banner.starts_at ? banner.starts_at.slice(0, 16) : '',
      ends_at: banner.ends_at ? banner.ends_at.slice(0, 16) : '',
      priority: banner.priority ?? banner.sort_order ?? 0,
      is_active: banner.is_active ?? banner.active ?? 1
    });
    setPreviewDevice('desktop');
    setIsDrawerOpen(true);
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

    addToast(`Banner "${banner.title}" deleted. Click to undo.`, 'warning', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: async () => {
          setBanners(prevBanners);
          await adminApi.createBanner({
            ...banner,
            desktop_image: banner.desktop_image || banner.image_desktop,
            mobile_image: banner.mobile_image || banner.image_mobile
          });
        }
      }
    });

    await adminApi.deleteBanner(banner.id);
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

  // Image Upload & Crop Handler
  const handleFileSelect = (e, deviceType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCropTargetDevice(deviceType);
    const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'png';
    setRawSourceExt(ext);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setRawSourceDataUrl(dataUrl);
      const img = new Image();
      img.onload = () => {
        setCropSourceImg(img);
        setCropZoom(1);
        setCropPan({ x: 0, y: 0 });
        setCropFocalPoint('center');
        setCropModalOpen(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Render crop preview on canvas
  useEffect(() => {
    if (!cropModalOpen || !cropSourceImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const isDesktop = cropTargetDevice === 'desktop';

    // Target dimensions: Desktop = 1800x600 (3:1), Mobile = 1200x900 (4:3)
    const targetW = isDesktop ? 900 : 600;
    const targetH = isDesktop ? 300 : 450;
    canvas.width = targetW;
    canvas.height = targetH;

    ctx.clearRect(0, 0, targetW, targetH);

    // Compute cover draw
    const scale = Math.max(targetW / cropSourceImg.width, targetH / cropSourceImg.height) * cropZoom;
    const scaledW = cropSourceImg.width * scale;
    const scaledH = cropSourceImg.height * scale;

    let posX = (targetW - scaledW) / 2 + cropPan.x;
    let posY = (targetH - scaledH) / 2 + cropPan.y;

    if (cropFocalPoint === 'top') posY = cropPan.y;
    if (cropFocalPoint === 'bottom') posY = targetH - scaledH + cropPan.y;

    ctx.drawImage(cropSourceImg, posX, posY, scaledW, scaledH);

    // 80% Safe zone guide
    ctx.strokeStyle = 'rgba(255, 77, 0, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const safeMarginX = targetW * 0.1;
    const safeMarginY = targetH * 0.1;
    ctx.strokeRect(safeMarginX, safeMarginY, targetW * 0.8, targetH * 0.8);
    ctx.setLineDash([]);
  }, [cropModalOpen, cropSourceImg, cropZoom, cropPan, cropFocalPoint, cropTargetDevice]);

  const handleApplyCrop = async () => {
    if (!canvasRef.current) return;
    setUploadingCrop(true);
    const canvas = canvasRef.current;
    const base64 = canvas.toDataURL('image/webp', 0.92);

    const res = await adminApi.uploadBannerImage({
      base64: base64,
      imageBase64: base64,
      filename: `banner_${cropTargetDevice}_${Date.now()}.webp`,
      deviceType: cropTargetDevice,
      type: cropTargetDevice
    });
    setUploadingCrop(false);

    if (res.data?.url) {
      if (cropTargetDevice === 'desktop') {
        setFormData(prev => ({ ...prev, image_desktop: res.data.url }));
      } else {
        setFormData(prev => ({ ...prev, image_mobile: res.data.url }));
      }
      addToast(`Cropped & uploaded ${cropTargetDevice} WebP banner`, 'success');
      setCropModalOpen(false);
    } else {
      addToast(res.error || 'Upload failed', 'error');
    }
  };

  const handleUploadOriginal = async () => {
    if (!rawSourceDataUrl) return;
    setUploadingCrop(true);
    const ext = rawSourceExt || 'png';
    const res = await adminApi.uploadBannerImage({
      base64: rawSourceDataUrl,
      imageBase64: rawSourceDataUrl,
      filename: `banner_${cropTargetDevice}_raw_${Date.now()}.${ext}`,
      deviceType: cropTargetDevice,
      type: cropTargetDevice
    });
    setUploadingCrop(false);

    if (res.data?.url) {
      if (cropTargetDevice === 'desktop') {
        setFormData(prev => ({ ...prev, image_desktop: res.data.url }));
      } else {
        setFormData(prev => ({ ...prev, image_mobile: res.data.url }));
      }
      addToast(`Uploaded ${cropTargetDevice} banner directly`, 'success');
      setCropModalOpen(false);
    } else {
      addToast(res.error || 'Upload failed', 'error');
    }
  };

  const handleSaveBanner = async (e) => {
    e?.preventDefault?.();
    if (!formData.title?.trim()) {
      addToast('Banner title is required', 'error');
      return;
    }
    const desktopImg = formData.image_desktop?.trim();
    if (!desktopImg) {
      addToast('Desktop banner image is required', 'error');
      return;
    }

    setSaving(true);
    const mobileImg = formData.image_mobile?.trim() || desktopImg;
    const payload = {
      title: formData.title.trim(),
      slot: formData.slot,
      audience: formData.audience || 'both',
      label: formData.label_pill?.trim() || null,
      label_pill: formData.label_pill?.trim() || null,
      desktop_image: desktopImg,
      image_desktop: desktopImg,
      mobile_image: mobileImg,
      image_mobile: mobileImg,
      thumb: mobileImg || desktopImg,
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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF4D00]" />
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
            className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add New Banner
          </button>
        </div>
      </div>

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
                    className="text-[11px] font-mono font-bold text-[#FF4D00] hover:underline flex items-center gap-1"
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
                      <tr key={banner.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
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
                              {label && (
                                <span className="inline-block bg-[#FF4D00] text-white text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5">
                                  {label}
                                </span>
                              )}
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
                                className="hover:text-[#FF4D00] p-0.5"
                                title="Move Up"
                              >
                                <ArrowUp size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveOrder(banner, 'down')}
                                className="hover:text-[#FF4D00] p-0.5"
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
        setIsDrawerOpen={setIsDrawerOpen}
        editingBanner={editingBanner}
        handleSaveBanner={handleSaveBanner}
        formData={formData}
        setFormData={setFormData}
        SLOTS={SLOTS}
        handleFileSelect={handleFileSelect}
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
        cropFocalPoint={cropFocalPoint}
        setCropFocalPoint={setCropFocalPoint}
        handleApplyCrop={handleApplyCrop}
      />
    </div>
  );
}
