import { describe, it, expect } from 'vitest';
import { formatMoney, formatINR, getResponsiveImageSrcSet } from '../../src/utils/formatters';

describe('Frontend Money & Image Formatters', () => {
  it('formats integer paise accurately without /100 bugs', () => {
    expect(formatMoney(149900)).toBe('₹1,499');
    expect(formatINR(149900)).toBe('₹1,499');
    expect(formatMoney(149950)).toBe('₹1,499.50');
    expect(formatMoney(1000000)).toBe('₹10,000');
    expect(formatMoney(null)).toBe('₹0');
  });

  it('builds responsive WebP srcset for product images and skips SVGs', () => {
    expect(getResponsiveImageSrcSet('/images/image-104.jpg')).toBe(
      '/images/image-104-200.webp 200w, /images/image-104-480.webp 480w, /images/image-104-1000.webp 1000w'
    );
    expect(getResponsiveImageSrcSet('/images/placeholder.svg')).toBeUndefined();
  });
});
