// src/components/admin/BrandingThemeTab.jsx
import React, { useState, useEffect } from 'react';
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
  LayoutDashboard
} from 'lucide-react';
import useToastStore from '@shared/store/toastStore';
import { useBranding } from '@app/providers/BrandingContext';
import {
  deriveColorTokens,
  findNearestAccessibleShade,
  parseHex
} from '@shared/utils/colorContrast';

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
  const { branding, setLiveBranding, refetchBranding: _refetchBranding } = useBranding();

  // Local form state
  const [formData, setFormData] = useState({ ...branding });
  const [initialData, setInitialData] = useState({ ...branding });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState('light'); // 'light' | 'dark'
  const [hexInput, setHexInput] = useState(branding.accent_hex || '#FF4D00');
  const [hexError, setHexError] = useState('');

  // Sync when context branding updates
  useEffect(() => {
    setFormData({ ...branding });
    setInitialData({ ...branding });
    setHexInput(branding.accent_hex || '#FF4D00');
    setHexError('');
  }, [branding]);

  // Track unsaved changes
  useEffect(() => {
    const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasUnsavedChanges(isDirty);
  }, [formData, initialData]);

  const currentAccent = parseHex(formData.accent_hex || '#FF4D00').hex || '#FF4D00';
  const derivedTokens = deriveColorTokens(currentAccent);

  // Handle color change (from preset, native picker, or valid hex) and broadcast live tokens to CSS
  const handleColorChange = (rawHex) => {
    setHexInput(rawHex);
    const parsed = parseHex(rawHex);
    if (!parsed.valid) {
      setHexError(parsed.error);
      return;
    }
    setHexError('');
    setHexInput(parsed.hex);
    const tokens = deriveColorTokens(parsed.hex);
    const updated = { ...formData, ...tokens };
    setFormData(updated);
    setLiveBranding(updated);
  };

  // One-click nearest accessible shade (>= 4.5:1 on white)
  const handleFixContrast = () => {
    const fixedHex = findNearestAccessibleShade(currentAccent, 4.5);
    handleColorChange(fixedHex);
    addToast({ type: 'info', message: `Adjusted to nearest accessible shade: ${fixedHex}` });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('techbazaar_token');
    return token
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  // Upload logo handler
  const handleFileUpload = async (e, targetType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      addToast({ type: 'error', message: 'SVG uploads are not allowed for security reasons. Use PNG, JPEG, or WebP.' });
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast({ type: 'error', message: 'File exceeds 2 MB limit.' });
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/admin/branding/logo', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            fileData: reader.result,
            fileName: file.name,
            targetType
          })
        });

        const json = await res.json();
        if (res.ok && json.data?.url) {
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
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Save branding settings
  const handleSave = async () => {
    if (hexError) {
      addToast({ type: 'error', message: 'Fix invalid hex colour before saving.' });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setInitialData(json.data);
        setFormData(json.data);
        setHexInput(json.data.accent_hex || '#FF4D00');
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

  // Reset all branding to system defaults
  const handleResetToDefault = () => {
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
      footer_dark_hex: '#0A0A0A',
      ...deriveColorTokens('#FF4D00')
    };
    setFormData(defaultState);
    setHexInput('#FF4D00');
    setHexError('');
    setLiveBranding(defaultState);
    addToast({ type: 'info', message: 'Reverted all settings to defaults. Click "Save Branding" to persist.' });
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
              <Sparkles className="w-4 h-4 text-accent-text" />
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
              <ImageIcon className="w-4 h-4 text-accent-text" />
              <span>2. Brand Logos & Favicon</span>
            </h3>
            {isUploading && (
              <span className="text-[10px] font-mono text-accent-text flex items-center gap-1">
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
              <Palette className="w-4 h-4 text-accent-text" />
              <span>3. Dynamic Accent Colour Engine</span>
            </h3>
            <button
              type="button"
              onClick={() => handleColorChange('#FF4D00')}
              className="text-[10px] font-mono uppercase text-[#6B6B6B] hover:text-[#0A0A0A] underline cursor-pointer"
            >
              Reset Colour to Orange
            </button>
          </div>

          {/* Color Picker + Hex Input */}
          <div className="p-3 bg-[#FAFAFA] border border-[#EAEAEA] space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="color"
                aria-label="Accent colour picker"
                value={currentAccent}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-12 h-10 border border-[#DDD] rounded-[2px] cursor-pointer p-0.5 bg-white shrink-0"
              />
              <div className="flex-1 min-w-[160px]">
                <label htmlFor="accent-hex-input" className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-0.5">
                  Hex Code (3 or 6 digits)
                </label>
                <input
                  id="accent-hex-input"
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleColorChange(e.target.value)}
                  placeholder="#2563EB"
                  className={`w-40 px-2.5 py-1 bg-white border text-xs font-mono font-bold uppercase outline-none ${
                    hexError ? 'border-red-500 text-red-700' : 'border-[#DDD] focus:border-[#0A0A0A]'
                  }`}
                />
                {hexError && (
                  <p className="text-[10px] text-red-600 font-mono mt-1" role="alert">
                    {hexError}
                  </p>
                )}
              </div>

              {/* Derived Text Shade Info */}
              {!derivedTokens.aa_text_pass && (
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#6B6B6B]">
                    Auto text shade: <span className="font-bold" style={{ color: derivedTokens.accent_text }}>{derivedTokens.accent_text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFixContrast}
                    className="text-[10px] underline font-semibold hover:opacity-80 mt-0.5 cursor-pointer"
                    style={{ color: derivedTokens.accent_text }}
                  >
                    Use nearest accessible shade
                  </button>
                </div>
              )}
            </div>

            {/* 3 Separate Truthful WCAG 2.1 Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#EAEAEA]">
              <div className={`p-2 border rounded-[2px] text-[10px] font-mono ${
                derivedTokens.aa_text_pass ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="font-bold flex items-center justify-between">
                  <span>Accent as text on white</span>
                  <span>{derivedTokens.aa_text_pass ? 'PASS' : 'FAIL'}</span>
                </div>
                <div className="mt-0.5 opacity-85">
                  {derivedTokens.contrast_ratio_white}:1 (needs 4.5:1)
                </div>
              </div>

              <div className={`p-2 border rounded-[2px] text-[10px] font-mono ${
                derivedTokens.aa_ui_pass ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="font-bold flex items-center justify-between">
                  <span>Accent as UI/graphics on white</span>
                  <span>{derivedTokens.aa_ui_pass ? 'PASS' : 'FAIL'}</span>
                </div>
                <div className="mt-0.5 opacity-85">
                  {derivedTokens.contrast_ratio_white}:1 (needs 3.0:1)
                </div>
              </div>

              <div className={`p-2 border rounded-[2px] text-[10px] font-mono ${
                derivedTokens.aa_label_pass ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="font-bold flex items-center justify-between">
                  <span>Label on accent buttons</span>
                  <span>{derivedTokens.aa_label_pass ? 'PASS' : 'LOW'}</span>
                </div>
                <div className="mt-0.5 opacity-85">
                  {derivedTokens.label_contrast_ratio}:1 ({derivedTokens.accent_contrast === '#0A0A0A' ? 'Near-black' : 'White'} label)
                </div>
              </div>
            </div>

            {!derivedTokens.aa_text_pass && (
              <div className="p-2 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2 rounded-[2px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  <strong>{currentAccent}</strong> fails 4.5:1 text contrast on white ({derivedTokens.contrast_ratio_white}:1). Text, links & prices will automatically use <strong>{derivedTokens.accent_text}</strong> while backgrounds/borders keep your chosen colour.
                </span>
              </div>
            )}
          </div>

          {/* 12 Curated Presets Grid */}
          <div>
            <span className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-2 font-semibold">
              Curated Theme Palettes
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {PRESET_COLORS.map(c => {
                const isSelected = currentAccent.toUpperCase() === c.hex.toUpperCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={`${c.name} (${c.hex})`}
                    onClick={() => handleColorChange(c.hex)}
                    className={`p-2 border rounded-[2px] text-left transition-all flex items-center gap-2 cursor-pointer ${
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
                      <div className="text-[11px] font-bold text-[#0A0A0A] leading-tight break-words">
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
            className="px-4 py-2 border border-[#EAEAEA] bg-white hover:bg-[#F7F7F7] text-xs font-mono uppercase font-semibold text-[#0A0A0A] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset All to Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || Boolean(hexError)}
            className="px-6 py-2.5 bg-[#0A0A0A] hover:bg-accent hover:text-accent-contrast text-white text-xs font-mono uppercase tracking-wider font-bold transition-colors flex items-center gap-2 rounded-[2px] shadow-sm cursor-pointer disabled:opacity-50"
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
              className="py-1 px-2.5 text-[9px] font-mono uppercase tracking-wider text-center font-bold rounded-[2px]"
              style={{ backgroundColor: currentAccent, color: derivedTokens.accent_contrast }}
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
                  className="absolute -top-1.5 -right-2 text-[9px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentAccent, color: derivedTokens.accent_contrast }}
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
                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: currentAccent, color: derivedTokens.accent_contrast }}
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums" style={{ color: derivedTokens.accent_text }}>
                    ₹27,990
                  </span>
                  <span
                    className="text-[10px] font-mono underline cursor-pointer"
                    style={{ color: derivedTokens.accent_text }}
                  >
                    View Specs
                  </span>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-[2px] transition-opacity hover:opacity-90"
                  style={{ backgroundColor: currentAccent, color: derivedTokens.accent_contrast }}
                >
                  Add to Bag
                </button>
              </div>
            </div>

            {/* 4. Highlight Tint + Admin Sidebar Highlight */}
            <div
              className="p-2.5 rounded-[2px] border text-[11px] font-mono"
              style={{
                backgroundColor: derivedTokens.accent_tint,
                borderColor: derivedTokens.accent_border,
                color: derivedTokens.accent_text
              }}
            >
              Bulk Tier Highlight: Save extra 12% on 10+ units
            </div>

            <div className={`p-2.5 rounded-[2px] border space-y-1.5 ${
              previewMode === 'dark' ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#EAEAEA]'
            }`}>
              <div className="text-[10px] font-mono uppercase text-[#8A8A8A] font-bold">
                Back-Office Navigation
              </div>
              <div 
                className="flex items-center justify-between px-2.5 py-1.5 text-xs font-mono uppercase font-bold rounded-[2px]"
                style={{ backgroundColor: currentAccent, color: derivedTokens.accent_contrast }}
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={13} />
                  <span>Dashboard (Active)</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: derivedTokens.accent_contrast }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
