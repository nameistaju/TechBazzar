// server/services/calculation.js
// Shared calculation engine with Indian GST rules, paise/integer precision, currency formatting,
// dual-cart pricing (Retail & Wholesale), wholesale group discounts, volume brackets, and coupon audience filtering.

/**
 * Format integer paise in INR using Indian numbering format (e.g. 149900 -> ₹1,499, 149950 -> ₹1,499.50)
 * @param {number} paise - Amount in integer Paise
 * @param {boolean} showSymbol - Whether to prepend ₹
 */
export function formatMoney(paise, showSymbol = true) {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return showSymbol ? '₹0' : '0';
  }
  const roundedPaise = Math.round(Number(paise));
  const isNegative = roundedPaise < 0;
  const absPaise = Math.abs(roundedPaise);
  const wholeRupees = Math.floor(absPaise / 100);
  const remPaise = absPaise % 100;
  const str = wholeRupees.toString();

  let formatted = '';
  if (str.length > 3) {
    const lastThree = str.substring(str.length - 3);
    const rest = str.substring(0, str.length - 3);
    formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    formatted = str;
  }

  const decimal = remPaise > 0 ? `.${String(remPaise).padStart(2, '0')}` : '';
  const prefix = isNegative ? '-' : '';
  return `${prefix}${showSymbol ? '₹' : ''}${formatted}${decimal}`;
}

export function formatINR(paise, showSymbol = true) {
  return formatMoney(paise, showSymbol);
}

/**
 * Convert integer paise to Indian numbering words (Lakhs, Crores)
 * e.g. 12499900 -> "One Lakh Twenty-Four Thousand Nine Hundred and Ninety-Nine Rupees Only"
 */
export function numberToWordsIndian(paiseAmount) {
  if (paiseAmount === 0) return 'Zero Rupees Only';
  if (!paiseAmount || isNaN(paiseAmount)) return '';

  const absPaise = Math.round(Math.abs(Number(paiseAmount)));
  const rupees = Math.floor(absPaise / 100);
  const paise = absPaise % 100;

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? '-' + ones[unit] : '');
  }

  function convertThreeDigits(n) {
    let result = '';
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (hundred > 0) {
      result += ones[hundred] + ' Hundred';
      if (rest > 0) result += ' and ';
    }
    if (rest > 0) {
      result += convertTwoDigits(rest);
    }
    return result;
  }

  let words = '';
  const crore = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) {
    words += convertThreeDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertThreeDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertThreeDigits(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertThreeDigits(remainder) + ' ';
  }

  words = words.trim() + ' Rupees';
  if (paise > 0) {
    words += ' and ' + convertTwoDigits(paise) + ' Paise';
  }
  words += ' Only';

  return words;
}

/**
 * Calculate single line item
 */
export function calculateLineItem({
  rate = 0,
  quantity = 1,
  discountPercent = 0,
  discountAmount = 0,
  taxRate = 18,
  isTaxInclusive = false
}) {
  const parsedRate = Number(rate) || 0;
  const parsedQty = Math.max(1, Number(quantity) || 1);
  const parsedTaxRate = Number(taxRate) || 0;

  const gross = parsedRate * parsedQty;
  let lineDiscount = 0;
  if (discountPercent > 0) {
    lineDiscount = Math.round((gross * discountPercent) / 100);
  } else if (discountAmount > 0) {
    lineDiscount = Math.min(gross, Number(discountAmount));
  }

  const afterDiscount = Math.max(0, gross - lineDiscount);

  let taxableValue = 0;
  let taxAmount = 0;
  let lineTotal = 0;

  if (isTaxInclusive) {
    taxableValue = Math.round(afterDiscount / (1 + parsedTaxRate / 100));
    taxAmount = afterDiscount - taxableValue;
    lineTotal = afterDiscount;
  } else {
    taxableValue = afterDiscount;
    taxAmount = Math.round((taxableValue * parsedTaxRate) / 100);
    lineTotal = taxableValue + taxAmount;
  }

  return {
    rate: parsedRate,
    quantity: parsedQty,
    gross,
    discountPercent,
    discountAmount: lineDiscount,
    taxableValue,
    taxRate: parsedTaxRate,
    taxAmount,
    lineTotal
  };
}

/**
 * Calculate full document totals (for Estimates & Invoices)
 */
export function isIntraStateSupply(placeOfSupply = 'Karnataka (29)', companyState = 'Karnataka (29)') {
  const norm = (s) => String(s || '').trim().toLowerCase();
  const a = norm(placeOfSupply);
  const b = norm(companyState);
  if (!a || !b) return true;
  if (a === b) return true;
  const codeA = a.match(/\b(\d{2})\b/)?.[1];
  const codeB = b.match(/\b(\d{2})\b/)?.[1];
  if (codeA && codeB) return codeA === codeB;
  const nameA = a.replace(/\(\d+\)/g, '').trim();
  const nameB = b.replace(/\(\d+\)/g, '').trim();
  return nameA === nameB;
}

export function calculateDocumentTotals({
  items = [],
  discountAmount = 0,
  shippingAmount = 0,
  placeOfSupply = 'Karnataka (29)',
  companyState = 'Karnataka (29)'
}) {
  let subtotal = 0;
  let totalLineDiscounts = 0;
  let totalTaxable = 0;
  let totalTax = 0;

  const calculatedItems = items.map(item => {
    const calc = calculateLineItem(item);
    subtotal += calc.gross;
    totalLineDiscounts += calc.discountAmount;
    totalTaxable += calc.taxableValue;
    totalTax += calc.taxAmount;
    return { ...item, ...calc };
  });

  const parsedDocDiscount = Math.min(totalTaxable, Math.max(0, Math.round(Number(discountAmount) || 0)));
  const parsedShipping = Math.max(0, Math.round(Number(shippingAmount) || 0));

  const isIntraState = isIntraStateSupply(placeOfSupply, companyState);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isIntraState) {
    cgstAmount = Math.round(totalTax / 2);
    sgstAmount = totalTax - cgstAmount;
  } else {
    igstAmount = totalTax;
  }

  const rawTotal = (totalTaxable - parsedDocDiscount) + totalTax + parsedShipping;
  const roundedTotal = Math.round(rawTotal);
  const roundOff = roundedTotal - rawTotal;

  return {
    items: calculatedItems,
    subtotal,
    lineDiscounts: totalLineDiscounts,
    discountAmount: parsedDocDiscount,
    taxableValue: totalTaxable - parsedDocDiscount,
    totalTax,
    cgstAmount,
    sgstAmount,
    igstAmount,
    shippingAmount: parsedShipping,
    roundOff,
    total: roundedTotal,
    amountInWords: numberToWordsIndian(roundedTotal)
  };
}

/**
 * Evaluate Discount Rule against Cart (Channel, Group, Buyer, Volume aware)
 * @param {Object} discount - discount row from DB
 * @param {Object} cart - { items: [...] }
 * @param {Object} user - optional user object
 * @param {string} channel - 'retail' | 'wholesale'
 */
export function evaluateDiscount(discount, cart, user = null, channel = 'retail') {
  if (!discount || !discount.active) {
    return { valid: false, reason: 'Discount code is inactive or expired' };
  }

  // 1. Channel / Audience check
  const audience = discount.audience || 'both';
  if (audience === 'retail' && channel === 'wholesale') {
    return { valid: false, reason: 'This coupon is valid for retail orders only' };
  }
  if (audience === 'wholesale' && channel === 'retail') {
    return { valid: false, reason: 'This coupon is valid for wholesale business orders only' };
  }

  // 2. Group restriction (for wholesale)
  if (discount.group_ids && channel === 'wholesale') {
    try {
      const allowedGroups = typeof discount.group_ids === 'string' ? JSON.parse(discount.group_ids) : discount.group_ids;
      if (Array.isArray(allowedGroups) && allowedGroups.length > 0) {
        const userGroupId = user?.group_id || user?.groupId;
        if (!userGroupId || !allowedGroups.includes(Number(userGroupId))) {
          return { valid: false, reason: 'This coupon is restricted to specific wholesale buyer groups' };
        }
      }
    } catch {}
  }

  // 3. Buyer restriction
  if (discount.buyer_ids) {
    try {
      const allowedBuyers = typeof discount.buyer_ids === 'string' ? JSON.parse(discount.buyer_ids) : discount.buyer_ids;
      if (Array.isArray(allowedBuyers) && allowedBuyers.length > 0) {
        if (!user?.id || !allowedBuyers.includes(Number(user.id))) {
          return { valid: false, reason: 'This coupon is exclusive to select accounts' };
        }
      }
    } catch {}
  }

  // Check validity dates
  const now = new Date();
  if (discount.starts_at && new Date(discount.starts_at) > now) {
    return { valid: false, reason: 'Promotion has not started yet' };
  }
  if (discount.ends_at && new Date(discount.ends_at) < now) {
    return { valid: false, reason: 'Promotion has expired' };
  }

  // Check usage limit
  if (discount.usage_limit && discount.used_count >= discount.usage_limit) {
    return { valid: false, reason: 'Discount usage limit reached' };
  }

  const cartItems = cart.items || [];
  const cartSubtotal = cartItems.reduce((acc, item) => acc + (Number(item.price || item.unitPrice || 0) * (Number(item.quantity) || 1)), 0);
  const cartQty = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

  // Check minimum cart amount
  if (discount.min_cart_amount && cartSubtotal < discount.min_cart_amount) {
    return {
      valid: false,
      reason: `Minimum cart value of ${formatINR(discount.min_cart_amount)} required (current: ${formatINR(cartSubtotal)})`
    };
  }

  // Check minimum quantity
  if (discount.min_quantity && cartQty < discount.min_quantity) {
    return {
      valid: false,
      reason: `Minimum ${discount.min_quantity} items required in cart (current: ${cartQty})`
    };
  }

  // Filter items by scope
  let eligibleItems = cartItems;
  if (discount.scope !== 'cart' && discount.scope_values) {
    let allowedValues = [];
    try {
      allowedValues = typeof discount.scope_values === 'string' 
        ? JSON.parse(discount.scope_values) 
        : discount.scope_values;
    } catch {
      allowedValues = [];
    }

    if (allowedValues.length > 0) {
      if (discount.scope === 'categories') {
        eligibleItems = cartItems.filter(i => allowedValues.includes(i.category));
      } else if (discount.scope === 'products') {
        eligibleItems = cartItems.filter(i => allowedValues.includes(i.id || i.product_id));
      } else if (discount.scope === 'brands') {
        eligibleItems = cartItems.filter(i => allowedValues.includes(i.brand));
      }
    }
  }

  if (eligibleItems.length === 0) {
    return { valid: false, reason: `No eligible items in cart for this discount (${discount.scope})` };
  }

  const eligibleAmount = eligibleItems.reduce((acc, i) => acc + (Number(i.price || i.unitPrice || 0) * (Number(i.quantity) || 1)), 0);

  let discountAmount = 0;
  if (discount.type === 'percentage') {
    discountAmount = Math.round((eligibleAmount * discount.value) / 100);
  } else if (discount.type === 'flat') {
    discountAmount = Math.min(discount.value, eligibleAmount);
  } else if (discount.type === 'rule_higher' || discount.type === 'rule_lower') {
    const pctVal = Math.round((eligibleAmount * (discount.rule_percentage || 0)) / 100);
    const flatVal = discount.rule_flat || 0;

    if (discount.type === 'rule_higher' || discount.rule_mode === 'higher') {
      discountAmount = Math.max(pctVal, flatVal);
    } else {
      discountAmount = Math.min(pctVal, flatVal);
    }
    discountAmount = Math.min(discountAmount, eligibleAmount);
  }

  // Volume-based discount tier check (extra wholesale discount)
  let volumeDiscountAmount = 0;
  if (discount.volume_tiers) {
    try {
      const tiers = typeof discount.volume_tiers === 'string' ? JSON.parse(discount.volume_tiers) : discount.volume_tiers;
      if (Array.isArray(tiers)) {
        // Find highest qualifying tier
        const sorted = [...tiers].sort((a, b) => b.min_amount - a.min_amount);
        const match = sorted.find(t => cartSubtotal >= t.min_amount);
        if (match) {
          volumeDiscountAmount = Math.round((cartSubtotal * match.extra_percent) / 100);
        }
      }
    } catch {}
  }

  return {
    valid: true,
    discountId: discount.id,
    code: discount.code,
    title: discount.title,
    discountAmount,
    volumeDiscountAmount,
    eligibleAmount,
    savingsText: formatINR(discountAmount + volumeDiscountAmount)
  };
}

// ==========================================
// RETAIL CART PRICING ENGINE
// ==========================================

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

// ==========================================
// WHOLESALE & BULK-TIER PRICING ENGINE
// ==========================================

/**
 * Determine wholesale tier price, custom price lists, and group discounts.
 * @param {Object} product - Product object with moq, pack_size, tier1-4 prices
 * @param {number} quantity - Desired order quantity
 * @param {Object} group - Wholesale group (e.g. Gold with extra_discount_percent: 5)
 * @param {number} customPrice - Optional buyer-specific price override from price_lists table
 */
export function getWholesaleTier(product, quantity = 0, group = null, customPrice = null) {
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

  // Buyer-specific price list override
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
      nudgeText: `Add ${qtyNeeded} more units to unlock Tier 4 master-distributor rate (Save ₹${unitSavings}/unit)`
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
 * Calculate full wholesale cart including tier prices, group extra discount, volume tiers, GST, and MOV.
 */
export function calculateWholesaleCart({
  items = [],
  user = null,
  group = null,
  priceLists = [], // array of { product_id, custom_price, min_qty }
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

  // Effective MOV & Free shipping from group (all in integer paise)
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

    // Check custom price list
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

  // Evaluate coupon discount if applicable
  let couponDiscountAmount = 0;
  let appliedDiscount = null;
  if (discount) {
    const evalRes = evaluateDiscount(discount, { items: processedItems }, user, 'wholesale');
    if (evalRes.valid) {
      couponDiscountAmount = evalRes.discountAmount;
      appliedDiscount = evalRes;
    }
  }

  // Automatic wholesale volume tier discount: >= ₹1,00,000 (10000000 paise) -> 5%, >= ₹50,000 (5000000 paise) -> 3%
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

  // Per-item GST calculation on post-discount line totals (honoring each item's gst_rate & is_tax_inclusive)
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

  const isIntraState = isIntraStateSupply(placeOfSupply, companyState);
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
    appliedDiscount,
    taxableValue: totalTaxableValue,
    totalTax,
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
