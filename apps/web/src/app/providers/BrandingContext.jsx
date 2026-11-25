// src/context/BrandingContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { deriveColorTokens, hexToRgbChannels } from '@shared/utils/colorContrast';

const BrandingContext = createContext(null);

const DEFAULT_BRANDING = {
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

// Apply CSS variables synchronously to :root
export function applyCssVariables(tokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const derived = tokens.accent_hex ? deriveColorTokens(tokens.accent_hex) : DEFAULT_BRANDING;
  const accent = tokens.accent_hex || derived.accent_hex;
  const accentRgb = tokens.accent_rgb || derived.accent_rgb || hexToRgbChannels(accent);
  const hoverRgb = tokens.accent_hover_rgb || derived.accent_hover_rgb;
  const pressedRgb = tokens.accent_pressed_rgb || derived.accent_pressed_rgb;
  const tintRgb = tokens.accent_tint_rgb || derived.accent_tint_rgb;
  const borderRgb = tokens.accent_border_rgb || derived.accent_border_rgb;
  const textRgb = tokens.accent_text_rgb || derived.accent_text_rgb;
  const contrastRgb = tokens.accent_contrast_rgb || derived.accent_contrast_rgb;
  const ring = tokens.accent_ring || derived.accent_ring;
  const footerDark = tokens.footer_dark_hex || DEFAULT_BRANDING.footer_dark_hex;

  // RGB channel variables for Tailwind opacity utilities (bg-accent/10, ring-accent/40, etc.)
  root.style.setProperty('--accent', accentRgb);
  root.style.setProperty('--accent-hover', hoverRgb);
  root.style.setProperty('--accent-pressed', pressedRgb);
  root.style.setProperty('--accent-tint', tintRgb);
  root.style.setProperty('--accent-border', borderRgb);
  root.style.setProperty('--accent-text', textRgb);
  root.style.setProperty('--accent-contrast', contrastRgb);
  root.style.setProperty('--accent-ring', ring);
  root.style.setProperty('--accent-hex', accent);
  root.style.setProperty('--footer-dark', footerDark);

  // Backward-compatible --color-primary mapping for existing styles
  root.style.setProperty('--color-primary', `rgb(${accentRgb})`);
  root.style.setProperty('--color-primary-hover', `rgb(${hoverRgb})`);
  root.style.setProperty('--color-primary-light', `rgb(${tintRgb})`);

  // Update theme-color meta tag
  const themeMeta = document.querySelector("meta[name='theme-color']");
  if (themeMeta) {
    themeMeta.setAttribute('content', accent);
  }

  // Update dynamic favicon link if available
  if (tokens.favicon) {
    const link = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = tokens.favicon;
    }
  }

  // Update document title if brand_name is provided
  if (tokens.brand_name) {
    document.title = tokens.brand_name + (tokens.tagline ? ` — ${tokens.tagline}` : '');
  }
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(() => {
    try {
      const saved = localStorage.getItem('techbazaar_branding');
      if (saved) {
        const parsed = JSON.parse(saved);
        applyCssVariables(parsed);
        return { ...DEFAULT_BRANDING, ...parsed };
      }
    } catch {}
    applyCssVariables(DEFAULT_BRANDING);
    return DEFAULT_BRANDING;
  });

  const [isLoading, setIsLoading] = useState(false);

  const fetchBranding = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/branding');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setBranding(json.data);
          applyCssVariables(json.data);
          try {
            localStorage.setItem('techbazaar_branding', JSON.stringify(json.data));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Using cached or default branding:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Update local branding immediately (for live preview or optimistic save)
  const setLiveBranding = useCallback((newTokens) => {
    setBranding(prev => {
      const updated = { ...prev, ...newTokens };
      applyCssVariables(updated);
      return updated;
    });
  }, []);

  return (
    <BrandingContext.Provider value={{
      branding,
      setLiveBranding,
      refetchBranding: fetchBranding,
      isLoading
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return {
      branding: DEFAULT_BRANDING,
      setLiveBranding: () => {},
      refetchBranding: () => {},
      isLoading: false
    };
  }
  return ctx;
}
