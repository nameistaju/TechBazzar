import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  numberToWordsIndian,
  calculateRetailCart,
  calculateWholesaleCart
} from '../src/services/calculation/index.js';

describe('Calculation Engine (Integer Paise)', () => {
  it('formats paise into Indian Rupees cleanly', () => {
    expect(formatMoney(149900)).toBe('₹1,499');
    expect(formatMoney(149950)).toBe('₹1,499.50');
    expect(formatMoney(0)).toBe('₹0');
    expect(formatMoney(250000)).toBe('₹2,500');
  });

  it('converts paise to Indian words', () => {
    expect(numberToWordsIndian(149900)).toBe(
      'One Thousand Four Hundred and Ninety-Nine Rupees Only'
    );
    expect(numberToWordsIndian(149950)).toBe(
      'One Thousand Four Hundred and Ninety-Nine Rupees and Fifty Paise Only'
    );
  });

  it('calculates retail cart shipping thresholds in paise', () => {
    const below = calculateRetailCart({
      items: [{ price: 100000, quantity: 1 }]
    });
    expect(below.subtotal).toBe(100000);
    expect(below.shipping).toBe(9900);
    expect(below.total).toBe(109900);

    const above = calculateRetailCart({
      items: [{ price: 150000, quantity: 1 }]
    });
    expect(above.shipping).toBe(0);
    expect(above.total).toBe(150000);
  });

  it('preserves Platinum free_shipping_threshold=0 and splits intra/inter-state GST', () => {
    const prod = { id: 'p1', price: 150000, mrp: 200000, moq: 10, tier1_price: 120000, gst_rate: 18, is_tax_inclusive: 1 };

    const intra = calculateWholesaleCart({
      items: [{ product: prod, quantity: 10 }],
      group: { id: 4, name: 'Platinum', extra_discount_percent: 5, min_order_value: 200000, free_shipping_threshold: 0 },
      placeOfSupply: 'Karnataka (29)',
      companyState: 'Karnataka (29)'
    });
    expect(intra.shipping).toBe(0);
    expect(intra.igstAmount).toBe(0);
    expect(intra.cgstAmount + intra.sgstAmount).toBe(intra.totalTax);
    expect(intra.taxableValue + intra.totalTax + intra.shipping + intra.roundOff).toBe(intra.total);

    const inter = calculateWholesaleCart({
      items: [{ product: prod, quantity: 10 }],
      group: { id: 1, name: 'Bronze', extra_discount_percent: 0, min_order_value: 250000, free_shipping_threshold: 1000000 },
      placeOfSupply: 'Maharashtra (27)',
      companyState: 'Karnataka (29)'
    });
    expect(inter.cgstAmount).toBe(0);
    expect(inter.sgstAmount).toBe(0);
    expect(inter.igstAmount).toBe(inter.totalTax);
    expect(inter.taxableValue + inter.totalTax + inter.shipping + inter.roundOff).toBe(inter.total);
  });
});
