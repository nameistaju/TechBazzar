import { describe, it, expect } from 'vitest';
import { formatMoney, formatINR, getResponsiveImageSrcSet } from '../src/utils/formatters';
import { calculateRetailCart, calculateWholesaleCart, getWholesaleTier } from '../src/utils/wholesaleCalculation';

describe('Frontend Money, Image & Calculation Formatters', () => {
  it('formats integer paise accurately without /100 bugs', () => {
    expect(formatMoney(149900)).toBe('₹1,499');
    expect(formatINR(149900)).toBe('₹1,499');
    expect(formatMoney(149950)).toBe('₹1,499.50');
    expect(formatMoney(1000000)).toBe('₹10,000');
    expect(formatMoney(0)).toBe('₹0');
    expect(formatMoney(null)).toBe('₹0');
    expect(formatMoney(-50000)).toBe('-₹500');
  });

  it('builds responsive WebP srcset for product images and skips SVGs', () => {
    expect(getResponsiveImageSrcSet('/images/image-104.jpg')).toBe(
      '/images/image-104-200.webp 200w, /images/image-104-480.webp 480w, /images/image-104-1000.webp 1000w'
    );
    expect(getResponsiveImageSrcSet('/images/placeholder.svg')).toBeUndefined();
    expect(getResponsiveImageSrcSet(null)).toBeUndefined();
  });

  it('calculates retail cart shipping & discount in integer paise', () => {
    const res = calculateRetailCart({
      items: [{ price: 149900, quantity: 1 }],
      discount: { discountAmount: 14990 }
    });
    expect(res.subtotal).toBe(149900);
    expect(res.shipping).toBe(0);
    expect(res.total).toBe(149900 - 14990);
  });

  it('applies wholesale tier pricing and Platinum 0 free-shipping threshold without fallback', () => {
    const prod = { id: 'p1', price: 200000, moq: 10, tier1_qty: 10, tier1_price: 160000, tier2_qty: 50, tier2_price: 140000 };
    const t1 = getWholesaleTier(prod, 10);
    expect(t1.finalUnitPrice).toBe(160000);
    const t2 = getWholesaleTier(prod, 50);
    expect(t2.finalUnitPrice).toBe(140000);

    const plat = calculateWholesaleCart({
      items: [{ product: prod, quantity: 10 }],
      group: { id: 4, extra_discount_percent: 5, min_order_value: 200000, free_shipping_threshold: 0 }
    });
    expect(plat.shipping).toBe(0);
    expect(plat.freeShippingProgress).toBe(100);
    expect(plat.taxableValue + plat.totalTax + plat.shipping + plat.roundOff).toBe(plat.total);
  });
});
