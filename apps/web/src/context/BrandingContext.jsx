// src/context/BrandingContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  accent_hex: '#FF4D00',
  accent_hover: '#E04400',
  accent_pressed: '#C73C00',
  accent_tint: '#FFEDE6',
  accent_border: '#FFD3BF',
  accent_contrast: '#FFFFFF',
  accent_ring: 'rgba(255, 77, 0, 0.35)',
  footer_dark_hex: '#0A0A0A'
};

// Apply CSS variables synchronously to :root
export function applyCssVariables(tokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const accent = tokens.accent_hex || DEFAULT_BRANDING.accent_hex;
  const hover = tokens.accent_hover || DEFAULT_BRANDING.accent_hover;
  const pressed = tokens.accent_pressed || DEFAULT_BRANDING.accent_pressed;
  const tint = tokens.accent_tint || DEFAULT_BRANDING.accent_tint;
  const border = tokens.accent_border || DEFAULT_BRANDING.accent_border;
  const contrast = tokens.accent_contrast || DEFAULT_BRANDING.accent_contrast;
  const ring = tokens.accent_ring || DEFAULT_BRANDING.accent_ring;
  const footerDark = tokens.footer_dark_hex || DEFAULT_BRANDING.footer_dark_hex;

  // Modern --accent variables
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-hover', hover);
  root.style.setProperty('--accent-pressed', pressed);
  root.style.setProperty('--accent-tint', tint);
  root.style.setProperty('--accent-border', border);
  root.style.setProperty('--accent-contrast', contrast);
  root.style.setProperty('--accent-ring', ring);
  root.style.setProperty('--footer-dark', footerDark);

  // Backward-compatible --color-primary mapping for existing styles
  root.style.setProperty('--color-primary', accent);
  root.style.setProperty('--color-primary-hover', hover);
  root.style.setProperty('--color-primary-light', tint);

  // Update dynamic favicon link if available
  if (tokens.favicon) {
    let link = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = tokens.favicon;
    }
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
