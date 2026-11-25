import React from 'react';
import { X, Monitor, Smartphone, Upload, Calendar } from 'lucide-react';

export default function BannerDrawerModal({
  isDrawerOpen,
  setIsDrawerOpen,
  editingBanner,
  handleSaveBanner,
  formData,
  setFormData,
  SLOTS,
  handleFileSelect,
  previewDevice,
  setPreviewDevice,
  categories,
  products,
  saving,
}) {
  if (!isDrawerOpen) return null;

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
              Configuring dual-aspect media with zero layout shift
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 hover:bg-[#EAEAEA] rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSaveBanner} className="flex-1 overflow-y-auto p-6 space-y-6">
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
                required
                className="w-full h-10 px-3 border border-[#EAEAEA] rounded bg-white text-xs outline-none focus:border-[#0A0A0A]"
              />
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

          {/* DUAL IMAGE UPLOAD & CANVAS CROPPING SECTION */}
          <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                  Dual Responsive Images (3:1 Desktop & 4:3 Mobile)
                </h4>
                <p className="text-[10px] text-[#8A8A8A]">
                  Served via standard HTML5 &lt;picture&gt; element for high CWV scores.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Desktop Image (3:1, 1800x600) */}
              <div className="p-3 bg-white border border-[#EAEAEA] rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#0A0A0A] flex items-center gap-1">
                    <Monitor size={12} /> Desktop (3:1)
                  </span>
                  <span className="text-[9px] text-[#8A8A8A]">1800×600 recommended</span>
                </div>

                <div className="aspect-[3/1] bg-[#F7F7F7] border border-dashed border-[#BDBDBD] rounded overflow-hidden flex items-center justify-center relative group">
                  {formData.image_desktop ? (
                    <img
                      src={formData.image_desktop}
                      alt="Desktop preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-[#8A8A8A]">No desktop image</span>
                  )}

                  <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload size={14} className="mb-1" />
                    <span className="text-[10px] font-bold">Crop / Upload (3:1)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'desktop')}
                    />
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Image URL or upload"
                  value={formData.image_desktop}
                  onChange={(e) => setFormData({ ...formData, image_desktop: e.target.value })}
                  className="w-full h-8 px-2 border border-[#EAEAEA] rounded text-[11px] outline-none"
                />
              </div>

              {/* Mobile Image (4:3, 1200x900) */}
              <div className="p-3 bg-white border border-[#EAEAEA] rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#0A0A0A] flex items-center gap-1">
                    <Smartphone size={12} /> Mobile (4:3)
                  </span>
                  <span className="text-[9px] text-[#8A8A8A]">1200×900 recommended</span>
                </div>

                <div className="aspect-[4/3] max-h-36 bg-[#F7F7F7] border border-dashed border-[#BDBDBD] rounded overflow-hidden flex items-center justify-center relative group mx-auto">
                  {formData.image_mobile ? (
                    <img
                      src={formData.image_mobile}
                      alt="Mobile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-[#8A8A8A]">No mobile image</span>
                  )}

                  <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload size={14} className="mb-1" />
                    <span className="text-[10px] font-bold">Crop / Upload (4:3)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'mobile')}
                    />
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Mobile Image URL (optional)"
                  value={formData.image_mobile}
                  onChange={(e) => setFormData({ ...formData, image_mobile: e.target.value })}
                  className="w-full h-8 px-2 border border-[#EAEAEA] rounded text-[11px] outline-none"
                />
              </div>
            </div>

            {/* DEVICE PREVIEW SWITCHER */}
            <div className="pt-3 border-t border-[#EAEAEA] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">
                  Live Device Preview Simulator:
                </span>
                <div className="inline-flex rounded border border-[#EAEAEA] p-0.5 bg-white">
                  {[
                    { id: 'desktop', label: 'Desktop 1440px', width: '100%', aspect: 'aspect-[3/1]' },
                    { id: 'tablet', label: 'Tablet 768px', width: '70%', aspect: 'aspect-[3/1]' },
                    { id: 'mobile', label: 'Mobile 375px', width: '50%', aspect: 'aspect-[4/3]' }
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setPreviewDevice(d.id)}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
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
                  className={`transition-all duration-300 rounded overflow-hidden shadow-md bg-white ${
                    previewDevice === 'mobile' ? 'w-48 aspect-[4/3]' : previewDevice === 'tablet' ? 'w-80 aspect-[3/1]' : 'w-full aspect-[3/1]'
                  }`}
                >
                  <img
                    src={previewDevice === 'mobile' ? (formData.image_mobile || formData.image_desktop) : formData.image_desktop}
                    alt="Simulated preview"
                    className="w-full h-full object-cover"
                  />
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
                <option value="external">Custom URL</option>
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
                  {products.slice(0, 50).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku || p.id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={formData.link_type === 'brand' ? 'boAt / OnePlus / Sony' : formData.link_type === 'coupon' ? 'WHOLESALE10' : '/shop or https://...'}
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
                className="accent-[#FF4D00]"
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
                  Start Date & Time (UTC/Local)
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
                  End Date & Time (UTC/Local)
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
              className="accent-[#FF4D00] w-4 h-4"
            />
            <label htmlFor="is_active" className="text-xs font-bold text-[#0A0A0A] cursor-pointer">
              Campaign Active (Visible in Storefront Slot)
            </label>
          </div>

          <div className="pt-4 border-t border-[#EAEAEA] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2.5 border border-[#EAEAEA] hover:border-[#0A0A0A] text-[#6B6B6B] text-xs uppercase font-bold rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs uppercase font-bold tracking-wider rounded transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingBanner ? 'Update Banner' : 'Publish Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
