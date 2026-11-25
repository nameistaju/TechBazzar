import { numberToWordsIndian } from './money.js';

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
