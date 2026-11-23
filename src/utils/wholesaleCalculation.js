// src/utils/wholesaleCalculation.js
// Shared wholesale calculation engine on client (tier pricing, MOQ validation, pack steps, margin estimates, and cart totals)

import { formatINR } from './formatters';

export { formatINR };

/**
 * Determine the wholesale tier price and volume discounts based on order quantity.
 * @param {Object} product - Product object with moq, pack_size, tier1/2/3 qty and prices
 * @param {number} quantity - Desired order quantity
 */
export function getWholesaleTier(product = {}, quantity = 0) {
  const qty = Number(quantity) || 0;
  const moq = Number(product.moq || 10);
  const packSize = Number(product.pack_size || 5);
  const basePrice = Number(product.price || 1000);
  const mrp = Number(product.mrp || product.original_price || product.suggested_retail_price || Math.round(basePrice * 1.35));

  const t1Qty = Number(product.tier1_qty || moq);
  const t1Price = Number(product.tier1_price || basePrice);

  const t2Qty = Number(product.tier2_qty || 50);
  const t2Price = Number(product.tier2_price || Math.round(basePrice * 0.9));

  const t3Qty = Number(product.tier3_qty || 100);
  const t3Price = Number(product.tier3_price || Math.round(basePrice * 0.8));

  let activeTier = 1;
  let unitPrice = t1Price;

  if (qty >= t3Qty) {
    activeTier = 3;
    unitPrice = t3Price;
  } else if (qty >= t2Qty) {
    activeTier = 2;
    unitPrice = t2Price;
  } else {
    activeTier = 1;
    unitPrice = t1Price;
  }

  const isBelowMoq = qty < moq;
  const lineTotal = unitPrice * qty;
  const lineMrpTotal = mrp * qty;
  const savingsVsMrp = Math.max(0, lineMrpTotal - lineTotal);
  const savingsPercent = mrp > 0 ? Math.round(((mrp - unitPrice) / mrp) * 100) : 0;
  const resaleMarginPercent = product.suggested_retail_price && product.suggested_retail_price > 0
    ? Math.round(((product.suggested_retail_price - unitPrice) / product.suggested_retail_price) * 100)
    : savingsPercent;

  // Next tier upsell nudge
  let nextTier = null;
  if (activeTier === 1) {
    const qtyNeeded = Math.max(0, t2Qty - qty);
    const unitSavings = Math.max(0, t1Price - t2Price);
    nextTier = {
      targetTier: 2,
      targetQty: t2Qty,
      targetUnitPrice: t2Price,
      qtyNeeded,
      unitSavings,
      nudgeText: `Add ${qtyNeeded} more units to unlock ₹${unitSavings} lower unit price (Tier 2: ₹${t2Price.toLocaleString('en-IN')}/unit)`
    };
  } else if (activeTier === 2) {
    const qtyNeeded = Math.max(0, t3Qty - qty);
    const unitSavings = Math.max(0, t2Price - t3Price);
    nextTier = {
      targetTier: 3,
      targetQty: t3Qty,
      targetUnitPrice: t3Price,
      qtyNeeded,
      unitSavings,
      nudgeText: `Add ${qtyNeeded} more units to unlock Tier-3 bulk rate (Save ₹${unitSavings} more / unit)`
    };
  }

  return {
    moq,
    packSize,
    activeTier,
    unitPrice,
    basePrice,
    mrp,
    isBelowMoq,
    lineTotal,
    savingsVsMrp,
    savingsPercent,
    resaleMarginPercent,
    tiers: [
      { tier: 1, minQty: t1Qty, maxQty: t2Qty - 1, price: t1Price, label: `${t1Qty}+ pcs`, active: activeTier === 1 },
      { tier: 2, minQty: t2Qty, maxQty: t3Qty - 1, price: t2Price, label: `${t2Qty}+ pcs`, active: activeTier === 2 },
      { tier: 3, minQty: t3Qty, maxQty: null, price: t3Price, label: `${t3Qty}+ pcs`, active: activeTier === 3 }
    ],
    nextTier
  };
}

/**
 * Calculate full wholesale cart including tier prices, MOQ checks, GST breakdown, and minimum order values.
 */
export function calculateWholesaleCart({
  items = [],
  placeOfSupply = 'Karnataka (29)',
  minOrderValue = 2500,
  freeShippingThreshold = 10000
}) {
  let subtotal = 0;
  let totalMrp = 0;
  let hasMoqViolations = false;

  const processedItems = items.map(item => {
    const product = item.product || item;
    const qty = Number(item.quantity) || product.moq || 1;
    const tier = getWholesaleTier(product, qty);
    const taxRate = Number(product.gst_rate || product.taxRate || 18);
    const isTaxInclusive = product.is_tax_inclusive !== undefined ? Boolean(product.is_tax_inclusive) : true;

    if (tier.isBelowMoq) {
      hasMoqViolations = true;
    }

    subtotal += tier.lineTotal;
    totalMrp += tier.mrp * qty;

    // GST calculation per line item
    let taxableValue = tier.lineTotal;
    let taxAmount = 0;
    if (isTaxInclusive) {
      taxableValue = Math.round(tier.lineTotal / (1 + taxRate / 100));
      taxAmount = tier.lineTotal - taxableValue;
    } else {
      taxableValue = tier.lineTotal;
      taxAmount = Math.round((taxableValue * taxRate) / 100);
    }

    return {
      ...item,
      quantity: qty,
      unitPrice: tier.unitPrice,
      tierApplied: tier.activeTier,
      isBelowMoq: tier.isBelowMoq,
      moq: tier.moq,
      packSize: tier.packSize,
      lineTotal: tier.lineTotal,
      taxableValue,
      taxRate,
      taxAmount,
      savingsVsMrp: tier.savingsVsMrp,
      nextTier: tier.nextTier
    };
  });

  const totalSavingsVsMrp = Math.max(0, totalMrp - subtotal);
  const meetsMinOrderValue = subtotal >= minOrderValue;
  const amountToMinOrder = Math.max(0, minOrderValue - subtotal);

  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 199;
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const total = subtotal + shipping;

  return {
    items: processedItems,
    subtotal,
    totalMrp,
    totalSavingsVsMrp,
    shipping,
    total,
    minOrderValue,
    meetsMinOrderValue,
    amountToMinOrder,
    freeShippingThreshold,
    freeShippingProgress,
    amountToFreeShipping,
    hasMoqViolations
  };
}
