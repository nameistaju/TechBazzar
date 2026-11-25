import { evaluateDiscount } from './discounts.js';

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

  // Evaluate retail discount if provided
  let discountAmount = 0;
  let appliedDiscount = null;
  if (discount) {
    const evalRes = evaluateDiscount(discount, { items: processedItems }, null, 'retail');
    if (evalRes.valid) {
      discountAmount = evalRes.discountAmount;
      appliedDiscount = evalRes;
    }
  }

  const isFreeShippingMet = subtotal >= freeShippingThreshold || subtotal === 0;
  const shipping = isFreeShippingMet ? 0 : shippingFee;
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  // Add tax for any tax-exclusive retail items
  let exclusiveTax = 0;
  let remDisc = Math.min(subtotal, discountAmount);
  processedItems.forEach((item, idx) => {
    const share = idx === processedItems.length - 1
      ? remDisc
      : (subtotal > 0 ? Math.round((Math.min(subtotal, discountAmount) * item.lineTotal) / subtotal) : 0);
    remDisc = Math.max(0, remDisc - share);
    const prod = item.product || item;
    const isTaxInclusive = prod.is_tax_inclusive !== undefined ? Boolean(prod.is_tax_inclusive) : true;
    const taxRate = Number(prod.gst_rate || prod.taxRate || 18);
    if (!isTaxInclusive) {
      exclusiveTax += Math.round((Math.max(0, item.lineTotal - share) * taxRate) / 100);
    }
  });

  const total = Math.max(0, subtotal - discountAmount) + exclusiveTax + shipping;
  const totalSavingsVsMrp = Math.max(0, totalMrp - total);

  return {
    items: processedItems,
    subtotal,
    totalMrp,
    discountAmount,
    appliedDiscount,
    shipping,
    total,
    freeShippingThreshold,
    freeShippingProgress,
    amountToFreeShipping,
    isFreeShippingMet,
    totalSavingsVsMrp
  };
}
