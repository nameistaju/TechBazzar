// server/services/calculation.js
// Shared calculation engine with Indian GST rules, paise/integer precision, and currency formatting.

/**
 * Format amount in INR using Indian numbering format (e.g. 1,24,999)
 * @param {number} amount - Amount in Rupees
 * @param {boolean} showSymbol - Whether to prepend ₹
 */
export function formatINR(amount, showSymbol = true) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showSymbol ? '₹0' : '0';
  }
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const rounded = Math.round(absVal);
  const str = rounded.toString();

  let formatted = '';
  if (str.length > 3) {
    const lastThree = str.substring(str.length - 3);
    const rest = str.substring(0, str.length - 3);
    formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    formatted = str;
  }

  const prefix = isNegative ? '-' : '';
  return `${prefix}${showSymbol ? '₹' : ''}${formatted}`;
}

/**
 * Convert number to Indian numbering words (Lakhs, Crores)
 * e.g. 124999 -> "One Lakh Twenty-Four Thousand Nine Hundred and Ninety-Nine Rupees Only"
 */
export function numberToWordsIndian(num) {
  if (num === 0) return 'Zero Rupees Only';
  if (!num || isNaN(num)) return '';

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

  const rupees = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - rupees) * 100);

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
    // Price includes tax: base = total / (1 + rate)
    taxableValue = Math.round(afterDiscount / (1 + parsedTaxRate / 100));
    taxAmount = afterDiscount - taxableValue;
    lineTotal = afterDiscount;
  } else {
    // Price excludes tax
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

  const parsedDocDiscount = Math.min(totalTaxable, Math.max(0, Number(discountAmount) || 0));
  const parsedShipping = Math.max(0, Number(shippingAmount) || 0);

  // If intra-state (same state code): 50% CGST + 50% SGST
  // If inter-state: 100% IGST
  const isIntraState = placeOfSupply.trim().toLowerCase() === companyState.trim().toLowerCase();

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
  const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;

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
 * Evaluate Discount Rule against Cart
 */
export function evaluateDiscount(discount, cart) {
  if (!discount || !discount.active) {
    return { valid: false, reason: 'Discount code is inactive or expired' };
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
  const cartSubtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);

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
    } catch (e) {
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

  const eligibleAmount = eligibleItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  let discountAmount = 0;
  if (discount.type === 'percentage') {
    discountAmount = Math.round((eligibleAmount * discount.value) / 100);
  } else if (discount.type === 'flat') {
    discountAmount = Math.min(discount.value, eligibleAmount);
  } else if (discount.type === 'rule_higher' || discount.type === 'rule_lower') {
    // E.g. "25% OR ₹200 whichever is higher/lower"
    const pctVal = Math.round((eligibleAmount * (discount.rule_percentage || 0)) / 100);
    const flatVal = discount.rule_flat || 0;

    if (discount.type === 'rule_higher' || discount.rule_mode === 'higher') {
      discountAmount = Math.max(pctVal, flatVal);
    } else {
      discountAmount = Math.min(pctVal, flatVal);
    }
    discountAmount = Math.min(discountAmount, eligibleAmount);
  }

  return {
    valid: true,
    discountId: discount.id,
    code: discount.code,
    title: discount.title,
    discountAmount,
    eligibleAmount,
    savingsText: formatINR(discountAmount)
  };
}
