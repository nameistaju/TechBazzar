import React, { useState } from 'react';
import { X, Monitor, Smartphone, Upload, Calendar, Crop, Trash2, AlertTriangle } from 'lucide-react';

function getFilename(url) {
  if (!url) return '';
  return url.split('/').pop().split('?')[0];
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BannerDrawerModal({
  isDrawerOpen,
  handleCloseDrawer,
  editingBanner,
  handleSaveBanner,
  formData,
  setFormData,
  SLOTS,
  handleFileSelect,
  handleOpenCropForExisting,
  imageMeta,
  formErrors,
  hasUnsavedChanges,
  previewDevice,
  setPreviewDevice,
  categories,
  products,
  saving,
}) {
  const [dragTarget, setDragTarget] = useState(null);

  if (!isDrawerOpen) return null;

  const onDropFile = (e, deviceType) => {
    e.preventDefault();
    setDragTarget(null);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelect({ target: { files: [file], value: '' } }, deviceType);
    }
  };

  const renderImageCard = (deviceType) => {
    const isDesktop = deviceType === 'desktop';
    const imageUrl = isDesktop ? formData.image_desktop : formData.image_mobile;
    const meta = imageMeta?.[deviceType];
    const dimsText = meta?.width && meta?.height ? `${meta.width}×${meta.height}` : (isDesktop ? '1800×600' : '1200×900');
    const sizeText = meta?.size ? formatBytes(meta.size) : '';

    return (
      <div className="p-3 bg-white border border-[#EAEAEA] rounded space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-[#0A0A0A] flex items-center gap-1">
            {isDesktop ? <Monitor size={12} /> : <Smartphone size={12} />}
            {isDesktop ? 'Desktop (3:1)' : 'Mobile (4:3)'}
          </span>
          <span className="text-[10px] text-[#6B6B6B]">
            {isDesktop ? '1800 × 600' : '1200 × 900'}
          </span>
        </div>

        {/* Preview + Click/Drop Upload Area (non-overlapping) */}
        <label
          onDragOver={(e) => { e.preventDefault(); setDragTarget(deviceType); }}
          onDragLeave={() => setDragTarget(null)}
          onDrop={(e) => onDropFile(e, deviceType)}
          className={`block ${isDesktop ? 'aspect-[3/1]' : 'aspect-[4/3] max-h-36 mx-auto'} bg-[#F7F7F7] border border-dashed rounded overflow-hidden flex items-center justify-center relative group cursor-pointer transition-colors ${
            dragTarget === deviceType ? 'border-accent bg-accent-tint' : 'border-[#BDBDBD] hover:border-[#0A0A0A]'
          }`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={formData.alt || `${deviceType} banner preview`}
              className="w-full h-full object-cover"
              style={{ objectPosition: `${formData.focal_x ?? 50}% ${formData.focal_y ?? 50}%` }}
            />
          ) : (
            <div className="text-center p-2 text-[10px] text-[#6B6B6B] flex flex-col items-center gap-1">
              <Upload size={14} />
              <span>Drop image or click to upload</span>
            </div>
          )}
          <input
            type="file"
            aria-label={isDesktop ? 'Upload desktop banner image' : 'Upload mobile banner image'}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelect(e, deviceType)}
          />
        </label>

        {/* Read-only file chip + Replace / Crop / Remove buttons */}
        {imageUrl ? (
          <div className="space-y-2">
            <div className="px-2 py-1.5 bg-[#F7F7F7] border border-[#EAEAEA] rounded flex items-center justify-between gap-2 text-[10px]">
              <span className="font-semibold text-[#0A0A0A] truncate" title={getFilename(imageUrl)}>
                {getFilename(imageUrl)}
              </span>
              <span className="text-[#6B6B6B] shrink-0">
                {dimsText}{sizeText ? ` • ${sizeText}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="flex-1 py-1 px-2 border border-[#EAEAEA] hover:border-[#0A0A0A] rounded text-[10px] font-bold uppercase text-center cursor-pointer flex items-center justify-center gap-1">
                <Upload size={11} /> Replace
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, deviceType)}
                />
              </label>
              <button
                type="button"
                onClick={() => handleOpenCropForExisting(deviceType, imageUrl)}
                className="py-1 px-2 border border-[#EAEAEA] hover:border-[#0A0A0A] rounded text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
              >
                <Crop size={11} /> Crop
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({
                  ...prev,
                  [isDesktop ? 'image_desktop' : 'image_mobile']: ''
                }))}
                className="py-1 px-2 border border-red-200 text-red-600 hover:bg-red-50 rounded text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                title={`Remove ${deviceType} image`}
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-[#8A8A8A]">
            {isDesktop ? 'Required. JPG, PNG or WebP (max 5 MB).' : 'Optional. Defaults to desktop image if omitted.'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col font-mono text-xs">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#EAEAEA] flex items-center justify-between bg-[#F7F7F7]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A0A0A]">
              {editingBanner ? 'Edit Banner Configuration' : 'Create New Campaign Banner'}
            </h3>
            <span className="text-[10px] text-[#6B6B6B]">
              Desktop image: 1800 × 600 (3:1). Mobile image: 1200 × 900 (4:3).
            </span>
          </div>
          <button
            type="button"
            onClick={handleCloseDrawer}
            aria-label="Close banner drawer"
            className="p-1.5 hover:bg-[#EAEAEA] rounded cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
            <AlertTriangle size={13} className="shrink-0" />
            <span>You have unsaved changes in this banner.</span>
          </div>
        )}

        {/* Drawer Form Body */}
        <form onSubmit={handleSaveBanner} noValidate className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Slot Selector */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-[#6B6B6B] mb-1.5">
              Target Placement Slot *
            </label>
            <select
              value={formData.slot}
              onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
              className="w-full h-10 px-3 border border-[#EAEAEA] rounded bg-white text-xs outline-none focus:border-[#0A0A0A]"
            >
              {SLOTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.page} Page • {s.location})
                </option>
              ))}
            </select>
            {formErrors?.slot && <p className="text-[10px] text-red-600 mt-1">{formErrors.slot}</p>}
          </div>

          {/* Title & Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase font-bold text-[#6B6B6B] mb-1.5">
                Internal Campaign Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Boat Airdopes Monsoon Sale"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full h-10 px-3 border rounded bg-white text-xs outline-none focus:border-[#0A0A0A] ${
                  formErrors?.title ? 'border-red-500' : 'border-[#EAEAEA]'
                }`}
              />
              {formErrors?.title && <p className="text-[10px] text-red-600 mt-1">{formErrors.title}</p>}
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-[#6B6B6B] mb-1.5">
                Badge Pill Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. EXCLUSIVE DEAL / FLAT 30% OFF"
                value={formData.label_pill}
                onChange={(e) => setFormData({ ...formData, label_pill: e.target.value })}
                className="w-full h-10 px-3 border border-[#EAEAEA] rounded bg-white text-xs outline-none focus:border-[#0A0A0A]"
              />
            </div>
          </div>

          {/* Alt Text */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-[#6B6B6B] mb-1.5">
              Accessible Alt Text *
            </label>
            <input
              type="text"
              placeholder="Describe the banner for screen readers (e.g. Festive bulk audio deals up to 15% off)"
              value={formData.alt || ''}
              onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
              className={`w-full h-10 px-3 border rounded bg-white text-xs outline-none focus:border-[#0A0A0A] ${
                formErrors?.alt ? 'border-red-500' : 'border-[#EAEAEA]'
              }`}
            />
            {formErrors?.alt && <p className="text-[10px] text-red-600 mt-1">{formErrors.alt}</p>}
          </div>

          {/* DUAL IMAGE UPLOAD & PREVIEW */}
          <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                Banner Images
              </h4>
              <p className="text-[10px] text-[#6B6B6B]">
                Desktop image: 1800 × 600 (3:1). Mobile image: 1200 × 900 (4:3). Images within 15% ratio are accepted directly; others open the crop tool.
              </p>
              {formErrors?.image_desktop && (
                <p className="text-[10px] text-red-600 mt-1 font-bold">{formErrors.image_desktop}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderImageCard('desktop')}
              {renderImageCard('mobile')}
            </div>

            {/* Focal Point Quick Alignment */}
            <div className="flex items-center justify-between pt-2 border-t border-[#EAEAEA]">
              <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">
                Focal Point ({formData.focal_x ?? 50}%, {formData.focal_y ?? 50}%)
              </span>
              <div className="inline-flex rounded border border-[#EAEAEA] p-0.5 bg-white">
                {[
                  { label: 'Top', x: 50, y: 15 },
                  { label: 'Center', x: 50, y: 50 },
                  { label: 'Bottom', x: 50, y: 85 }
                ].map((fp) => {
                  const active = (formData.focal_y ?? 50) === fp.y;
                  return (
                    <button
                      key={fp.label}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, focal_x: fp.x, focal_y: fp.y }))}
                      className={`px-2 py-0.5 text-[10px] rounded cursor-pointer ${
                        active ? 'bg-[#0A0A0A] text-white font-bold' : 'text-[#6B6B6B]'
                      }`}
                    >
                      {fp.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE DEVICE PREVIEW SIMULATOR */}
            <div className="pt-3 border-t border-[#EAEAEA] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">
                  Live Device Preview Simulator:
                </span>
                <div className="inline-flex rounded border border-[#EAEAEA] p-0.5 bg-white">
                  {[
                    { id: 'desktop', label: 'Desktop 1440' },
                    { id: 'tablet', label: 'Tablet 768' },
                    { id: 'mobile', label: 'Mobile 375' }
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setPreviewDevice(d.id)}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                        previewDevice === d.id ? 'bg-[#0A0A0A] text-white font-bold' : 'text-[#6B6B6B]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#EAEAEA] p-3 rounded flex justify-center overflow-hidden">
                <div
                  className={`relative transition-all duration-300 rounded overflow-hidden shadow-md bg-neutral-100 ${
                    previewDevice === 'mobile'
                      ? 'w-48 aspect-[4/3]'
                      : previewDevice === 'tablet'
                        ? 'w-80 aspect-[3/1]'
                        : 'w-full aspect-[3/1]'
                  }`}
                >
                  {(formData.image_desktop || formData.image_mobile) ? (
                    <picture>
                      {previewDevice === 'mobile' && formData.image_mobile && (
                        <source media="(min-width: 0px)" srcSet={formData.image_mobile} />
                      )}
                      <source media="(max-width: 767px)" srcSet={formData.image_mobile || formData.image_desktop} />
                      <img
                        src={previewDevice === 'mobile' ? (formData.image_mobile || formData.image_desktop) : (formData.image_desktop || formData.image_mobile)}
                        alt={formData.alt || 'Simulated preview'}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${formData.focal_x ?? 50}% ${formData.focal_y ?? 50}%` }}
                      />
                    </picture>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#8A8A8A]">
                      No banner image
                    </div>
                  )}
                  {formData.label_pill && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-black/80 text-white">
                      {formData.label_pill}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Link Target Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase font-bold text-[#6B6B6B] mb-1.5">
                Link Type
              </label>
              <select
                value={formData.link_type}
                onChange={(e) => setFormData({ ...formData, link_type: e.target.value })}
                className="w-full h-10 px-3 border border-[#EAEAEA] rounded bg-white text-xs outline-none focus:border-[#0A0A0A]"
              >
                <option value="none">None (Display Only)</option>
                <option value="product">Specific Product</option>
                <option value="category">Category Catalog</option>
                <option value="brand">Brand Query</option>
                <option value="coupon">Coupon Discount Code</option>
                <option value="page">Internal Store Page</option>
                <option value="external">Custom External URL</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-[#6B6B6B] mb-1.5">
                Destination Target
              </label>
              {formData.link_type === 'category' ? (
                <select
                  value={formData.link_target}
                  onChange={(e) => setFormData({ ...formData, link_target: e.target.value })}
                  className="w-full h-10 px-3 border border-[#EAEAEA] rounded bg-white text-xs outline-none focus:border-[#0A0A0A]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : formData.link_type === 'product' ? (
                <select
                  value={formData.link_target}
                  onChange={(e) => setFormData({ ...formData, link_target: e.target.value })}
                  className="w-full h-10 px-3 border border-[#EAEAEA] rounded bg-white text-xs outline-none focus:border-[#0A0A0A]"
                >
                  <option value="">Select a product...</option>
                  {products.slice(0, 50).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku || p.id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={
                    formData.link_type === 'brand'
                      ? 'boAt / OnePlus / Sony'
                      : formData.link_type === 'coupon'
                        ? 'WELCOME10'
                        : '/shop or https://...'
                  }
                  value={formData.link_target}
                  onChange={(e) => setFormData({ ...formData, link_target: e.target.value })}
                  className="w-full h-10 px-3 border border-[#EAEAEA] rounded bg-white text-xs outline-none focus:border-[#0A0A0A]"
                />
              )}
            </div>
          </div>

          {/* Link Options & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="new_tab"
                checked={formData.new_tab}
                onChange={(e) => setFormData({ ...formData, new_tab: e.target.checked })}
                className="accent-accent"
              />
              <label htmlFor="new_tab" className="text-xs text-[#0A0A0A] cursor-pointer">
                Open destination in new browser tab
              </label>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-[#6B6B6B] mb-1.5">
                Display Priority (Lower = First)
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full h-10 px-3 border border-[#EAEAEA] rounded bg-white text-xs outline-none focus:border-[#0A0A0A]"
              />
            </div>
          </div>

          {/* Scheduling */}
          <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#0A0A0A]">
              <Calendar size={13} /> Automated Scheduling Window (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">
                  Start Date &amp; Time (UTC/Local)
                </label>
                <input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  className="w-full h-9 px-2 border border-[#EAEAEA] rounded bg-white text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">
                  End Date &amp; Time (UTC/Local)
                </label>
                <input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  className="w-full h-9 px-2 border border-[#EAEAEA] rounded bg-white text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active === 1}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              className="accent-accent w-4 h-4"
            />
            <label htmlFor="is_active" className="text-xs font-bold text-[#0A0A0A] cursor-pointer">
              Campaign Active (Visible in Storefront Slot)
            </label>
          </div>

          <div className="pt-4 border-t border-[#EAEAEA] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="px-4 py-2.5 border border-[#EAEAEA] hover:border-[#0A0A0A] text-[#6B6B6B] text-xs uppercase font-bold rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-accent-contrast text-xs uppercase font-bold tracking-wider rounded transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : editingBanner ? 'Update Banner' : 'Publish Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
