// src/utils/formatters.js
// Client formatting utilities for TechBazaar

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

export function getResponsiveImageSrcSet(src) {
  if (!src || typeof src !== 'string' || !src.startsWith('/images/')) return undefined;
  if (src.endsWith('.svg')) return undefined;
  const dotIdx = src.lastIndexOf('.');
  if (dotIdx === -1) return undefined;
  const base = src.slice(0, dotIdx);
  return `${base}-200.webp 200w, ${base}-480.webp 480w, ${base}-1000.webp 1000w`;
}
