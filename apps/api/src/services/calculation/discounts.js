import { formatINR } from './money.js';

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
