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
