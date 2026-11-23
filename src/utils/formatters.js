// src/utils/formatters.js
// Client formatting utilities for TechBazaar

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

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return String(dateStr);
  }
}
