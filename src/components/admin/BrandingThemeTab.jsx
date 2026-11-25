// src/components/admin/BrandingThemeTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, 
  Upload, 
  RefreshCw, 
  AlertTriangle, 
  Sun, 
  Moon, 
  RotateCcw, 
  Save, 
  Image as ImageIcon,
  Sparkles,
  ShoppingBag,
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';
import useToastStore from '../../store/toastStore';
import { useBranding } from '../../context/BrandingContext';

// 12 Curated Presets
const PRESET_COLORS = [
  { name: 'Sunset Orange', hex: '#FF4D00' },
  { name: 'Crimson Red', hex: '#E11D48' },
  { name: 'Electric Lime', hex: '#84CC16' },
  { name: 'Cobalt Blue', hex: '#2563EB' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Deep Teal', hex: '#0D9488' },
  { name: 'Electric Violet', hex: '#7C3AED' },
  { name: 'Hot Pink', hex: '#DB2777' },
  { name: 'Warm Amber', hex: '#D97706' },
  { name: 'Cyan Aqua', hex: '#0891B2' },
  { name: 'Vibrant Coral', hex: '#F97316' },
  { name: 'Minimal Graphite', hex: '#4B5563' }
];

export default function BrandingThemeTab() {
  const addToast = useToastStore((s) => s.addToast);
  const { branding, setLiveBranding, refetchBranding } = useBranding();

  // Local form state
  const [formData, setFormData] = useState({ ...branding });
  const [initialData, setInitialData] = useState({ ...branding });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState('light'); // 'light' | 'dark'

  // Sync when context branding updates
  useEffect(() => {
    setFormData({ ...branding });
    setInitialData({ ...branding });
  }, [branding]);

  // Track unsaved changes
  useEffect(() => {
    const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasUnsavedChanges(isDirty);
  }, [formData, initialData]);

  // Color calculations
  const hexToRgb = (hex) => {
    let c = hex.replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };

  const getLuminance = (r, g, b) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const getContrast = (hex1, hex2) => {
    try {
      const rgb1 = hexToRgb(hex1);
      const rgb2 = hexToRgb(hex2);
      const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
      const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
    } catch {
      return 1;
    }
  };

  const currentAccent = formData.accent_hex || '#FF4D00';
  const contrastOnWhite = getContrast(currentAccent, '#FFFFFF');
  const contrastOnBlack = getContrast(currentAccent, '#0A0A0A');
  const isContrastPass = contrastOnWhite >= 3.0 || contrastOnBlack >= 3.0;

  // Handle color change and broadcast live tokens to CSS
  const handleColorChange = (hex) => {
    const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
    const updated = { ...formData, accent_hex: cleanHex };
    setFormData(updated);
    setLiveBranding(updated);
  };

  // One-click accessible shade adjuster
  const handleFixContrast = () => {
    // If too light on white, darken it to achieve >= 4.5:1
    const rgb = hexToRgb(currentAccent);
    let factor = 0.75;
    const darkerR = Math.max(0, Math.round(rgb.r * factor));
    const darkerG = Math.max(0, Math.round(rgb.g * factor));
    const darkerB = Math.max(0, Math.round(rgb.b * factor));
    const fixedHex = '#' + [darkerR, darkerG, darkerB].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    handleColorChange(fixedHex);
    addToast({ type: 'info', message: `Adjusted to accessible shade: ${fixedHex}` });
  };

  // Upload logo handler
  const handleFileUpload = async (e, targetType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast({ type: 'error', message: 'File exceeds 2 MB limit.' });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/admin/branding/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: reader.result,
            fileName: file.name,
            targetType
          })
        });

        const json = await res.json();
        if (json.data?.url) {
          const fieldMap = {
            mark: 'logo_mark',
            wordmark: 'logo_wordmark',
            dark: 'logo_dark',
            favicon: 'favicon'
          };
          const targetField = fieldMap[targetType] || 'logo_mark';
          const updated = { ...formData, [targetField]: json.data.url };
          setFormData(updated);
          setLiveBranding(updated);
          addToast({ type: 'success', message: `${targetType.toUpperCase()} uploaded successfully.` });
        } else {
          addToast({ type: 'error', message: json.error || 'Failed to upload logo' });
        }
      } catch {
        addToast({ type: 'error', message: 'Failed to upload image' });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save branding settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (json.data) {
        setInitialData(json.data);
        setFormData(json.data);
        setLiveBranding(json.data);
        addToast({ type: 'success', message: 'Brand identity & theme saved successfully.' });
      } else {
        addToast({ type: 'error', message: json.error || 'Failed to save branding' });
      }
    } catch {
      addToast({ type: 'error', message: 'Server communication error while saving branding' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('Reset brand settings and accent colour to TechBazaar defaults?')) {
      const defaultState = {
        brand_name: 'TechBazaar',
        brand_name_part1: 'TECH',
        brand_name_part2: 'BAZAAR',
        use_split_name: true,
        use_text_wordmark: false,
        tagline: 'Curated Electronics & Modern Gadgets',
        logo_mark: '/favicon.png',
        logo_wordmark: '/logo.png',
        logo_dark: '/logo.png',
        favicon: '/favicon.png',
        accent_hex: '#FF4D00',
        footer_dark_hex: '#0A0A0A'
      };
      setFormData(defaultState);
      setLiveBranding(defaultState);
      addToast({ type: 'info', message: 'Reverted to defaults. Click "Save Branding" to commit.' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ======================================================== */}
      {/* LEFT COLUMN: BRANDING & THEME FORM (7 cols)             */}
      {/* ======================================================== */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono flex items-center justify-between rounded-[2px] animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You have unsaved branding modifications.</span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 bg-amber-700 text-white font-bold uppercase rounded text-[10px] hover:bg-amber-800"
            >
              Save Now
            </button>
          </div>
        )}

        {/* SECTION 1: BRAND IDENTITY & TYPOGRAPHY */}
        <div className="p-5 bg-white border border-[#EAEAEA] space-y-4 rounded-[2px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0A] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pop" />
              <span>1. Brand Identity & Wordmark</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Brand Name Input */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1 font-semibold">
                Brand Name (Single or Full)
              </label>
              <input
                type="text"
                value={formData.brand_name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const updated = { 
                    ...formData, 
                    brand_name: val,
                    brand_name_part1: val.length > 4 ? val.slice(0, 4).toUpperCase() : val.toUpperCase(),
                    brand_name_part2: val.length > 4 ? val.slice(4).toUpperCase() : ''
                  };
                  setFormData(updated);
                  setLiveBranding(updated);
                }}
                className="w-full px-3 py-2 border border-[#EAEAEA] text-xs font-semibold text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
                placeholder="TechBazaar"
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1 font-semibold">
                Storefront Tagline (Footer & Meta)
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => {
                  const updated = { ...formData, tagline: e.target.value };
                  setFormData(updated);
                  setLiveBranding(updated);
                }}
                className="w-full px-3 py-2 border border-[#EAEAEA] text-xs font-medium text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
                placeholder="Curated Electronics & Modern Gadgets"
              />
            </div>
          </div>

          {/* Split Wordmark Styling Toggle */}
          <div className="pt-2 border-t border-[#F0F0F0] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#0A0A0A]">Split Wordmark Weights</span>
                <p className="text-[11px] text-[#6B6B6B]">
                  Renders wordmark with light weight for Part 1 and bold weight for Part 2.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(formData.use_split_name)}
                onChange={(e) => {
                  const updated = { ...formData, use_split_name: e.target.checked };
                  setFormData(updated);
                  setLiveBranding(updated);
                }}
                className="w-4 h-4 accent-pop cursor-pointer"
              />
            </div>

            {formData.use_split_name && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7F7F7] border border-[#EAEAEA]">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Part 1 (Light weight)</label>
                  <input
                    type="text"
                    value={formData.brand_name_part1 || ''}
                    onChange={(e) => {
                      const updated = { ...formData, brand_name_part1: e.target.value };
                      setFormData(updated);
                      setLiveBranding(updated);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#DDD] text-xs font-light uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Part 2 (Bold weight)</label>
                  <input
                    type="text"
                    value={formData.brand_name_part2 || ''}
                    onChange={(e) => {
                      const updated = { ...formData, brand_name_part2: e.target.value };
                      setFormData(updated);
                      setLiveBranding(updated);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#DDD] text-xs font-bold uppercase"
                  />
                </div>
              </div>
            )}

            {/* Text Wordmark Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-semibold text-[#0A0A0A]">Use Text Wordmark instead of Image</span>
                <p className="text-[11px] text-[#6B6B6B]">
                  Displays the rendered typographic title directly on the storefront navbar.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(formData.use_text_wordmark)}
                onChange={(e) => {
                  const updated = { ...formData, use_text_wordmark: e.target.checked };
                  setFormData(updated);
                  setLiveBranding(updated);
                }}
                className="w-4 h-4 accent-pop cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: LOGO & VISUAL ASSETS */}
        <div className="p-5 bg-white border border-[#EAEAEA] space-y-4 rounded-[2px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0A] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pop" />
              <span>2. Brand Logos & Favicon</span>
            </h3>
            {isUploading && (
              <span className="text-[10px] font-mono text-pop flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Uploading...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Logo Mark (Square icon) */}
            <div className="p-3 border border-[#EAEAEA] bg-[#FAFAFA] rounded-[2px] space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-[#0A0A0A] block">
                Logo Mark (Icon)
              </span>
              <div className="h-16 flex items-center justify-center bg-white border border-dashed border-[#DDD] p-2">
                <img 
                  src={formData.logo_mark || '/favicon.png'} 
                  alt="Logo Mark" 
                  className="max-h-12 w-auto object-contain" 
                />
              </div>
              <label className="w-full py-1.5 bg-white hover:bg-[#F2F2F2] border border-[#DDD] text-[11px] font-mono uppercase font-semibold text-[#0A0A0A] flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload size={12} />
                <span>Upload Icon (512x512)</span>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  onChange={(e) => handleFileUpload(e, 'mark')}
                  className="hidden"
                />
              </label>
            </div>

            {/* 2. Full Wordmark */}
            <div className="p-3 border border-[#EAEAEA] bg-[#FAFAFA] rounded-[2px] space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-[#0A0A0A] block">
                Full Wordmark Logo
              </span>
              <div className="h-16 flex items-center justify-center bg-white border border-dashed border-[#DDD] p-2">
                <img 
                  src={formData.logo_wordmark || '/logo.png'} 
                  alt="Wordmark" 
                  className="max-h-12 w-auto object-contain" 
                />
              </div>
              <label className="w-full py-1.5 bg-white hover:bg-[#F2F2F2] border border-[#DDD] text-[11px] font-mono uppercase font-semibold text-[#0A0A0A] flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload size={12} />
                <span>Upload Wordmark (1200x300)</span>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  onChange={(e) => handleFileUpload(e, 'wordmark')}
                  className="hidden"
                />
              </label>
            </div>

            {/* 3. Dark Background Logo */}
            <div className="p-3 border border-[#EAEAEA] bg-[#FAFAFA] rounded-[2px] space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-[#0A0A0A] block">
                Dark Background Logo (Footer)
              </span>
              <div className="h-16 flex items-center justify-center bg-[#0A0A0A] border border-[#222] p-2">
                <img 
                  src={formData.logo_dark || formData.logo_wordmark || '/logo.png'} 
                  alt="Dark Logo" 
                  className="max-h-12 w-auto object-contain" 
                />
              </div>
              <label className="w-full py-1.5 bg-white hover:bg-[#F2F2F2] border border-[#DDD] text-[11px] font-mono uppercase font-semibold text-[#0A0A0A] flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload size={12} />
                <span>Upload Dark Logo</span>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  onChange={(e) => handleFileUpload(e, 'dark')}
                  className="hidden"
                />
              </label>
            </div>

            {/* 4. Favicon */}
            <div className="p-3 border border-[#EAEAEA] bg-[#FAFAFA] rounded-[2px] space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-[#0A0A0A] block">
                Favicon (Browser Tab Icon)
              </span>
              <div className="h-16 flex items-center justify-center bg-white border border-dashed border-[#DDD] p-2 gap-2">
                <img 
                  src={formData.favicon || '/favicon.png'} 
                  alt="Favicon" 
                  className="w-8 h-8 object-contain" 
                />
                <span className="text-[10px] font-mono text-[#8A8A8A]">32x32 / 64x64</span>
              </div>
              <label className="w-full py-1.5 bg-white hover:bg-[#F2F2F2] border border-[#DDD] text-[11px] font-mono uppercase font-semibold text-[#0A0A0A] flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload size={12} />
                <span>Upload Favicon</span>
                <input
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml"
                  onChange={(e) => handleFileUpload(e, 'favicon')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: DYNAMIC ACCENT COLOR ENGINE */}
        <div className="p-5 bg-white border border-[#EAEAEA] space-y-4 rounded-[2px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0A] flex items-center gap-2">
              <Palette className="w-4 h-4 text-pop" />
              <span>3. Dynamic Accent Colour Engine</span>
            </h3>
            <button
              type="button"
              onClick={() => handleColorChange('#FF4D00')}
              className="text-[10px] font-mono uppercase text-[#6B6B6B] hover:text-[#0A0A0A] underline"
            >
              Reset to Orange
            </button>
          </div>

          {/* Color Picker + Hex Input */}
          <div className="flex items-center gap-4 p-3 bg-[#FAFAFA] border border-[#EAEAEA]">
            <input
              type="color"
              value={currentAccent}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-10 border border-[#DDD] rounded-[2px] cursor-pointer p-0.5 bg-white"
            />
            <div className="flex-1">
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-0.5">Hex Code</label>
              <input
                type="text"
                value={currentAccent}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-36 px-2.5 py-1 bg-white border border-[#DDD] text-xs font-mono font-bold uppercase"
              />
            </div>

            {/* Accessibility AA Check Badge */}
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                {isContrastPass ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold rounded">
                    <CheckCircle2 size={11} /> WCAG AA PASS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold rounded">
                    <AlertTriangle size={11} /> LOW CONTRAST
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-[#8A8A8A] mt-0.5">
                Ratio on white: {contrastOnWhite}:1
              </div>
              {!isContrastPass && (
                <button
                  type="button"
                  onClick={handleFixContrast}
                  className="text-[10px] text-pop underline font-semibold hover:opacity-80 block ml-auto mt-0.5"
                >
                  Apply accessible shade
                </button>
              )}
            </div>
          </div>

          {/* 12 Curated Presets Grid */}
          <div>
            <span className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-2 font-semibold">
              Curated Theme Palettes
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {PRESET_COLORS.map(c => {
                const isSelected = currentAccent.toUpperCase() === c.hex.toUpperCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleColorChange(c.hex)}
                    className={`p-2 border rounded-[2px] text-left transition-all flex items-center gap-2 ${
                      isSelected 
                        ? 'border-[#0A0A0A] bg-white ring-1 ring-[#0A0A0A] shadow-xs' 
                        : 'border-[#EAEAEA] bg-white hover:border-[#999]'
                    }`}
                  >
                    <span 
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0" 
                      style={{ backgroundColor: c.hex }} 
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#0A0A0A] truncate leading-tight">
                        {c.name}
                      </div>
                      <div className="text-[9px] font-mono text-[#8A8A8A]">
                        {c.hex}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-4 py-2 border border-[#EAEAEA] bg-white hover:bg-[#F7F7F7] text-xs font-mono uppercase font-semibold text-[#0A0A0A] flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#0A0A0A] hover:bg-pop text-white text-xs font-mono uppercase tracking-wider font-bold transition-colors flex items-center gap-2 rounded-[2px] shadow-sm cursor-pointer"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Branding'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW PANEL (5 cols)    */}
      {/* ======================================================== */}
      <div className="lg:col-span-5 sticky top-20 space-y-4">
        <div className="p-4 bg-white border border-[#EAEAEA] rounded-[2px] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                Live Component Preview
              </span>
            </div>

            {/* Light / Dark Preview Switch */}
            <div className="inline-flex items-center p-0.5 rounded bg-[#F4F4F5] border border-[#E4E4E7]">
              <button
                type="button"
                onClick={() => setPreviewMode('light')}
                className={`p-1 rounded ${previewMode === 'light' ? 'bg-white shadow-xs text-[#0A0A0A]' : 'text-[#71717A]'}`}
                title="Light Preview"
              >
                <Sun size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('dark')}
                className={`p-1 rounded ${previewMode === 'dark' ? 'bg-[#0A0A0A] shadow-xs text-white' : 'text-[#71717A]'}`}
                title="Dark Preview"
              >
                <Moon size={13} />
              </button>
            </div>
          </div>

          {/* PREVIEW CONTAINER */}
          <div className={`p-4 rounded-[4px] border transition-colors space-y-4 ${
            previewMode === 'dark' 
              ? 'bg-[#121212] border-[#2E2E2E] text-white' 
              : 'bg-[#F9F9F9] border-[#EAEAEA] text-[#0A0A0A]'
          }`}>
            
            {/* 1. Mini Announcement Bar */}
            <div 
              className="py-1 px-2.5 text-[9px] font-mono uppercase tracking-wider text-center font-bold text-white rounded-[2px]"
              style={{ backgroundColor: currentAccent }}
            >
              FESTIVE LAUNCH • 20% DISCOUNT ON ALL AUDIO
            </div>

            {/* 2. Mini Navbar */}
            <div className={`p-2.5 rounded-[2px] border flex items-center justify-between ${
              previewMode === 'dark' ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#EAEAEA]'
            }`}>
              <div className="flex items-center gap-2">
                <img src={formData.logo_mark || '/favicon.png'} alt="Logo" className="w-5 h-5 object-contain" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  {formData.use_split_name ? (
                    <>
                      <span className="font-light">{formData.brand_name_part1 || 'TECH'}</span>
                      <span className="font-bold">{formData.brand_name_part2 || 'BAZAAR'}</span>
                    </>
                  ) : (
                    formData.brand_name || 'TechBazaar'
                  )}
                </span>
              </div>

              {/* Cart Badge with Accent Color */}
              <div className="relative">
                <ShoppingBag size={17} />
                <span 
                  className="absolute -top-1.5 -right-2 text-[9px] font-bold text-white min-w-4 h-4 px-1 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentAccent }}
                >
                  3
                </span>
              </div>
            </div>

            {/* 3. Mini Product Card */}
            <div className={`p-3 rounded-[2px] border ${
              previewMode === 'dark' ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#EAEAEA]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span 
                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: currentAccent }}
                >
                  -25% OFF
                </span>
                <span className="text-[9px] font-mono text-[#8A8A8A]">TB-ANC-001</span>
              </div>

              <div className="h-16 flex items-center justify-center p-2 mb-2 bg-[#F2F2F2] rounded-[2px]">
                <img 
                  src="/images/image-149.jpg" 
                  alt="Product preview" 
                  className="max-h-full object-contain" 
                />
              </div>

              <div className="text-xs font-medium truncate mb-1">
                Sennheiser Momentum 4 Wireless Audiophile ANC
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-bold tabular-nums">
                  ₹27,990
                </span>
                <button
                  type="button"
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-[2px] transition-opacity hover:opacity-90"
                  style={{ backgroundColor: currentAccent }}
                >
                  Add to Bag
                </button>
              </div>
            </div>

            {/* 4. Mini Admin Sidebar Highlight */}
            <div className={`p-2.5 rounded-[2px] border space-y-1.5 ${
              previewMode === 'dark' ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#EAEAEA]'
            }`}>
              <div className="text-[10px] font-mono uppercase text-[#8A8A8A] font-bold">
                Back-Office Navigation
              </div>
              <div 
                className="flex items-center justify-between px-2.5 py-1.5 text-xs font-mono uppercase font-bold text-white rounded-[2px]"
                style={{ backgroundColor: currentAccent }}
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={13} />
                  <span>Dashboard (Active)</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
