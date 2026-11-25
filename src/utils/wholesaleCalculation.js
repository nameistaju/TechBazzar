// src/utils/wholesaleCalculation.js
// Client calculation engine: Retail & Wholesale carts, group discounts, volume brackets, and INR formatters

import { formatINR, formatMoney } from './formatters';

export { formatINR, formatMoney };

/**
 * Determine wholesale tier price, group discounts, and custom pricing.
 */
export function getWholesaleTier(product = {}, quantity = 0, group = null, customPrice = null) {
  const qty = Number(quantity) || 0;
  const moq = Number(product.moq || 10);
  const packSize = Number(product.pack_size || 5);
  const baseWholesalePrice = Number(product.wholesale_price || product.price || 1000);
  const retailPrice = Number(product.price || 1000);
  const mrp = Number(product.mrp || product.original_price || product.suggested_retail_price || Math.round(retailPrice * 1.35));

  const t1Qty = Number(product.tier1_qty || moq);
  const t1Price = Number(product.tier1_price || baseWholesalePrice);

  const t2Qty = Number(product.tier2_qty || 50);
  const t2Price = Number(product.tier2_price || Math.round(t1Price * 0.9));

  const t3Qty = Number(product.tier3_qty || 100);
  const t3Price = Number(product.tier3_price || Math.round(t1Price * 0.8));

  const t4Qty = product.tier4_qty ? Number(product.tier4_qty) : null;
  const t4Price = product.tier4_price ? Number(product.tier4_price) : null;

  let activeTier = 1;
  let tierUnitPrice = t1Price;

  if (t4Qty && t4Price && qty >= t4Qty) {
    activeTier = 4;
    tierUnitPrice = t4Price;
  } else if (qty >= t3Qty) {
    activeTier = 3;
    tierUnitPrice = t3Price;
  } else if (qty >= t2Qty) {
    activeTier = 2;
    tierUnitPrice = t2Price;
  } else {
    activeTier = 1;
    tierUnitPrice = t1Price;
  }

  // Buyer custom price list override
  let hasCustomPrice = false;
  if (customPrice !== null && customPrice !== undefined && Number(customPrice) > 0) {
    tierUnitPrice = Number(customPrice);
    hasCustomPrice = true;
  }

  // Group extra discount % (e.g. 5% for Gold)
  const groupDiscountPercent = group?.extra_discount_percent ? Number(group.extra_discount_percent) : 0;
  const groupDiscountUnit = groupDiscountPercent > 0 ? Math.round((tierUnitPrice * groupDiscountPercent) / 100) : 0;
  const finalUnitPrice = Math.max(1, tierUnitPrice - groupDiscountUnit);

  const isBelowMoq = qty < moq;
  const lineTotal = finalUnitPrice * qty;
  const lineRetailTotal = retailPrice * qty;
  const lineMrpTotal = mrp * qty;
  const savingsVsMrp = Math.max(0, lineMrpTotal - lineTotal);
  const savingsVsRetail = Math.max(0, lineRetailTotal - lineTotal);
  const savingsPercent = mrp > 0 ? Math.round(((mrp - finalUnitPrice) / mrp) * 100) : 0;
  const resaleMarginPercent = product.suggested_retail_price && product.suggested_retail_price > 0
    ? Math.round(((product.suggested_retail_price - finalUnitPrice) / product.suggested_retail_price) * 100)
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
      nudgeText: `Add ${qtyNeeded} more units to unlock Tier 2 price (Save ₹${unitSavings}/unit)`
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
      nudgeText: `Add ${qtyNeeded} more units to unlock Tier 3 price (Save ₹${unitSavings}/unit)`
    };
  } else if (activeTier === 3 && t4Qty && t4Price) {
    const qtyNeeded = Math.max(0, t4Qty - qty);
    const unitSavings = Math.max(0, t3Price - t4Price);
    nextTier = {
      targetTier: 4,
      targetQty: t4Qty,
      targetUnitPrice: t4Price,
      qtyNeeded,
      unitSavings,
      nudgeText: `Add ${qtyNeeded} more units to unlock Tier 4 volume rate (Save ₹${unitSavings}/unit)`
    };
  }

  const tiersList = [
    { tier: 1, minQty: t1Qty, maxQty: t2Qty - 1, price: t1Price, label: `${t1Qty}+ pcs`, active: activeTier === 1 },
    { tier: 2, minQty: t2Qty, maxQty: t3Qty - 1, price: t2Price, label: `${t2Qty}+ pcs`, active: activeTier === 2 },
    { tier: 3, minQty: t3Qty, maxQty: t4Qty ? t4Qty - 1 : null, price: t3Price, label: `${t3Qty}+ pcs`, active: activeTier === 3 }
  ];
  if (t4Qty && t4Price) {
    tiersList.push({ tier: 4, minQty: t4Qty, maxQty: null, price: t4Price, label: `${t4Qty}+ pcs`, active: activeTier === 4 });
  }

  return {
    moq,
    packSize,
    activeTier,
    tierUnitPrice,
    groupDiscountPercent,
    groupDiscountUnit,
    finalUnitPrice,
    unitPrice: finalUnitPrice,
    basePrice: baseWholesalePrice,
    retailPrice,
    mrp,
    hasCustomPrice,
    isBelowMoq,
    lineTotal,
    savingsVsMrp,
    savingsVsRetail,
    savingsPercent,
    resaleMarginPercent,
    tiers: tiersList,
    nextTier
  };
}

/**
 * Calculate full retail cart (B2C, guest-first, no MOQs, no wholesale tiers)
 */
export function calculateRetailCart({
  items = [],
  discount = null,
  freeShippingThreshold = 149900,
  shippingFee = 9900
}) {
  let subtotal = 0;
  let totalMrp = 0;

  const processedItems = items.map(item => {
    const product = item.product || item;
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Math.round(Number(product.price || 0));
    const mrp = Math.round(Number(product.original_price || product.originalPrice || product.mrp || Math.round(unitPrice * 1.3)));
    const lineTotal = unitPrice * qty;
    const lineMrpTotal = mrp * qty;

    subtotal += lineTotal;
    totalMrp += lineMrpTotal;

    return {
      ...item,
      quantity: qty,
      unitPrice,
      retailPrice: unitPrice,
      mrp,
      lineTotal,
      savingsVsMrp: Math.max(0, lineMrpTotal - lineTotal)
    };
  });

  const discountAmount = discount?.discountAmount ? Number(discount.discountAmount) : 0;
  const isFreeShippingMet = subtotal >= freeShippingThreshold || subtotal === 0;
  const shipping = isFreeShippingMet ? 0 : shippingFee;
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const total = Math.max(0, subtotal - discountAmount) + shipping;
  const totalSavingsVsMrp = Math.max(0, totalMrp - total);

  return {
    items: processedItems,
    subtotal,
    totalMrp,
    discountAmount,
    shipping,
    total,
    freeShippingThreshold,
    freeShippingProgress,
    amountToFreeShipping,
    isFreeShippingMet,
    totalSavingsVsMrp
  };
}

/**
 * Calculate full wholesale cart including tier prices, group extra discount, volume tiers, GST, and MOV.
 */
export function calculateWholesaleCart({
  items = [],
  user = null,
  group = null,
  priceLists = [],
  discount = null,
  placeOfSupply = 'Karnataka (29)',
  companyState = 'Karnataka (29)',
  minOrderValue = 250000,
  freeShippingThreshold = 1000000
}) {
  let subtotal = 0;
  let totalMrp = 0;
  let totalRetail = 0;
  let totalGroupDiscount = 0;
  let hasMoqViolations = false;

  const effMinOrderValue = group?.min_order_value !== undefined && group?.min_order_value !== null
    ? Number(group.min_order_value)
    : minOrderValue;
  const effFreeShippingThreshold = group?.free_shipping_threshold !== undefined && group?.free_shipping_threshold !== null
    ? Number(group.free_shipping_threshold)
    : freeShippingThreshold;

  const processedItems = items.map(item => {
    const product = item.product || item;
    const qty = Math.max(1, Number(item.quantity) || product.moq || 10);
    const prodId = product.id || item.productId;

    const customMatch = priceLists.find(pl => (pl.product_id === prodId || pl.productId === prodId) && qty >= (pl.min_qty || 1));
    const customPrice = customMatch ? customMatch.custom_price || customMatch.customPrice : null;

    const tier = getWholesaleTier(product, qty, group, customPrice);
    const taxRate = Number(product.gst_rate || product.taxRate || 18);
    const isTaxInclusive = product.is_tax_inclusive !== undefined ? Boolean(product.is_tax_inclusive) : true;

    if (tier.isBelowMoq) {
      hasMoqViolations = true;
    }

    subtotal += tier.lineTotal;
    totalMrp += tier.mrp * qty;
    totalRetail += tier.retailPrice * qty;
    totalGroupDiscount += tier.groupDiscountUnit * qty;

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
      unitPrice: tier.finalUnitPrice,
      tierUnitPrice: tier.tierUnitPrice,
      groupDiscountUnit: tier.groupDiscountUnit,
      groupDiscountPercent: tier.groupDiscountPercent,
      tierApplied: tier.activeTier,
      isBelowMoq: tier.isBelowMoq,
      moq: tier.moq,
      packSize: tier.packSize,
      lineTotal: tier.lineTotal,
      taxableValue,
      taxRate,
      taxAmount,
      savingsVsMrp: tier.savingsVsMrp,
      savingsVsRetail: tier.savingsVsRetail,
      nextTier: tier.nextTier
    };
  });

  const couponDiscountAmount = discount?.discountAmount ? Number(discount.discountAmount) : 0;

  // Wholesale volume discount: >= ₹1,00,000 (10000000 paise) -> 5%, >= ₹50,000 (5000000 paise) -> 3%
  let volumeDiscountAmount = 0;
  let volumeDiscountPercent = 0;
  if (subtotal >= 10000000) {
    volumeDiscountPercent = 5;
    volumeDiscountAmount = Math.round((subtotal * 5) / 100);
  } else if (subtotal >= 5000000) {
    volumeDiscountPercent = 3;
    volumeDiscountAmount = Math.round((subtotal * 3) / 100);
  }

  const totalDiscount = Math.min(subtotal, couponDiscountAmount + volumeDiscountAmount);

  let totalTaxableValue = 0;
  let totalTax = 0;
  let remainingDiscount = totalDiscount;

  processedItems.forEach((item, idx) => {
    const share = idx === processedItems.length - 1
      ? remainingDiscount
      : (subtotal > 0 ? Math.round((totalDiscount * item.lineTotal) / subtotal) : 0);
    remainingDiscount = Math.max(0, remainingDiscount - share);
    const postDiscountLine = Math.max(0, item.lineTotal - share);
    const isTaxInclusive = item.product?.is_tax_inclusive !== undefined
      ? Boolean(item.product.is_tax_inclusive)
      : (item.is_tax_inclusive !== undefined ? Boolean(item.is_tax_inclusive) : true);

    if (isTaxInclusive) {
      const itemTaxable = Math.round(postDiscountLine / (1 + item.taxRate / 100));
      const itemTax = postDiscountLine - itemTaxable;
      totalTaxableValue += itemTaxable;
      totalTax += itemTax;
    } else {
      const itemTaxable = postDiscountLine;
      const itemTax = Math.round((itemTaxable * item.taxRate) / 100);
      totalTaxableValue += itemTaxable;
      totalTax += itemTax;
    }
  });

  const normState = (s) => String(s || '').trim().toLowerCase();
  const isIntraState = normState(placeOfSupply) === normState(companyState);
  const cgstAmount = isIntraState ? Math.round(totalTax / 2) : 0;
  const sgstAmount = isIntraState ? (totalTax - cgstAmount) : 0;
  const igstAmount = isIntraState ? 0 : totalTax;

  const meetsMinOrderValue = subtotal >= effMinOrderValue;
  const amountToMinOrder = Math.max(0, effMinOrderValue - subtotal);

  const shipping = subtotal >= effFreeShippingThreshold || subtotal === 0 ? 0 : 25000;
  const freeShippingProgress = effFreeShippingThreshold <= 0
    ? 100
    : Math.min(100, Math.round((subtotal / effFreeShippingThreshold) * 100));
  const amountToFreeShipping = Math.max(0, effFreeShippingThreshold - subtotal);

  const rawTotal = totalTaxableValue + totalTax + shipping;
  const total = Math.round(rawTotal);
  const roundOff = total - rawTotal;

  const totalSavingsVsMrp = Math.max(0, totalMrp - total);
  const totalSavingsVsRetail = Math.max(0, totalRetail - total);

  return {
    items: processedItems,
    subtotal,
    totalMrp,
    totalRetail,
    groupDiscountTotal: totalGroupDiscount,
    couponDiscountAmount,
    volumeDiscountAmount,
    volumeDiscountPercent,
    totalDiscount,
    appliedDiscount: discount,
    taxableValue: totalTaxableValue,
    totalTax,
    cgstAmount,
    sgstAmount,
    igstAmount,
    shipping,
    roundOff,
    total,
    couponDiscountAmount,
    volumeDiscountAmount,
    volumeDiscountPercent,
    totalDiscount,
    taxableValue: taxableValueAfterDiscounts,
    totalTax: estimatedTax,
    cgstAmount,
    sgstAmount,
    igstAmount,
    shipping,
    roundOff,
    total,
    minOrderValue: effMinOrderValue,
    meetsMinOrderValue,
    amountToMinOrder,
    freeShippingThreshold: effFreeShippingThreshold,
    freeShippingProgress,
    amountToFreeShipping,
    hasMoqViolations,
    totalSavingsVsMrp,
    totalSavingsVsRetail
  };
}
