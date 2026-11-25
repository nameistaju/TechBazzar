// server/db/seedAdmin.js
// Seeds complete business settings, sample customers, sample discounts, estimates, invoices, and activity logs

import db from '../index.js';
import { calculateDocumentTotals } from '../../src/services/calculation/index.js';

console.log('🌱 Seeding Admin Back-Office Data...');

// 1. Business & Invoice Settings
const defaultSettings = [
  { key: 'business_legal_name', value: 'TechBazaar India Private Limited' },
  { key: 'business_trade_name', value: 'TechBazaar' },
  { key: 'business_address', value: '108, 4th Cross, Koramangala 4th Block, Bengaluru, Karnataka 560034' },
  { key: 'business_state', value: 'Karnataka' },
  { key: 'business_state_code', value: '29' },
  { key: 'business_gstin', value: '29AABCT1337M1Z5' },
  { key: 'business_pan', value: 'AABCT1337M' },
  { key: 'business_phone', value: '+91 80 4920 1800' },
  { key: 'business_email', value: 'care@techbazaar.com' },
  { key: 'business_website', value: 'https://techbazaar.in' },
  { key: 'invoice_prefix', value: 'INV-2026-' },
  { key: 'estimate_prefix', value: 'EST-' },
  { key: 'invoice_terms', value: '1. Goods once sold will be accepted for return only in original sealed packaging within 7 days. 2. Standard manufacturer warranty applies. 3. Subject to Bengaluru jurisdiction.' },
  { key: 'invoice_notes', value: 'Thank you for choosing TechBazaar! For support, email care@techbazaar.com or call +91 80 4920 1800.' },
  { key: 'bank_name', value: 'HDFC Bank Ltd.' },
  { key: 'bank_account_no', value: '50200088912345' },
  { key: 'bank_ifsc', value: 'HDFC0001089' },
  { key: 'upi_id', value: 'techbazaar@hdfcbank' },
  { key: 'template', value: 'standard' },
  { key: 'currency_symbol', value: '₹' },
  { key: 'tax_inclusive_display', value: '1' },
  { key: 'default_low_stock_threshold', value: '3' },
  { key: 'order_prefix', value: 'TB-ORD-' }
];

const insertSetting = db.prepare(`
  INSERT INTO settings (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

db.transaction(() => {
  for (const s of defaultSettings) {
    insertSetting.run(s.key, s.value);
  }
})();
console.log('  ✓ Seeded default business & invoice settings');

// 2. Set Admin must_change_password = 1 for first login flow
db.prepare('UPDATE users SET must_change_password = 1 WHERE email = ?').run('admin@techbazaar.com');
console.log('  ✓ Set must_change_password = 1 for admin@techbazaar.com');

// 3. Customers
const sampleCustomers = [
  {
    name: 'Rohan Varma',
    email: 'rohan.varma@gmail.com',
    phone: '+91 98765 43210',
    gstin: '29AABCV9988D1Z2',
    billing_address: JSON.stringify({ line1: '402, Prestige Palms', city: 'Bengaluru', state: 'Karnataka', pincode: '560066' }),
    shipping_address: JSON.stringify({ line1: '402, Prestige Palms', city: 'Bengaluru', state: 'Karnataka', pincode: '560066' }),
    tags: JSON.stringify(['VIP', 'B2B', 'Repeat Buyer']),
    notes: 'Key corporate account for audio gear.'
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@outlook.com',
    phone: '+91 98200 11223',
    gstin: null,
    billing_address: JSON.stringify({ line1: 'Flat 12B, Sea Green', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' }),
    shipping_address: JSON.stringify({ line1: 'Flat 12B, Sea Green', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' }),
    tags: JSON.stringify(['Frequent Buyer']),
    notes: 'Prefers courier delivery via Bluedart.'
  },
  {
    name: 'Aarav Sharma',
    email: 'customer@techbazaar.com',
    phone: '+91 98111 22334',
    gstin: null,
    billing_address: JSON.stringify({ line1: 'Sector 45', city: 'Gurugram', state: 'Haryana', pincode: '122003' }),
    shipping_address: JSON.stringify({ line1: 'Sector 45', city: 'Gurugram', state: 'Haryana', pincode: '122003' }),
    tags: JSON.stringify(['Retail']),
    notes: 'Walk-in / online retail customer.'
  }
];

const insertCustomer = db.prepare(`
  INSERT INTO customers (name, email, phone, gstin, billing_address, shipping_address, tags, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    phone = excluded.phone,
    gstin = excluded.gstin,
    billing_address = excluded.billing_address,
    shipping_address = excluded.shipping_address,
    tags = excluded.tags,
    notes = excluded.notes
`);

db.transaction(() => {
  for (const c of sampleCustomers) {
    insertCustomer.run(c.name, c.email, c.phone, c.gstin, c.billing_address, c.shipping_address, c.tags, c.notes);
  }
})();
console.log('  ✓ Seeded 3 sample customers with GSTIN & addresses');

// 4. Discounts Engine (including "25% OR ₹200 whichever is higher/lower")
const sampleDiscounts = [
  {
    code: 'FESTIVE25',
    title: 'Festive Special (25% or ₹200 Higher)',
    description: 'Get 25% off or ₹200, whichever is higher, on orders above ₹1,000 when buying 2+ items.',
    type: 'rule_higher',
    value: 0,
    rule_percentage: 25,
    rule_flat: 20000,
    rule_mode: 'higher',
    scope: 'cart',
    scope_values: null,
    min_cart_amount: 100000,
    min_quantity: 2,
    first_order_only: 0,
    stackable: 0,
    priority: 1,
    usage_limit: 500,
    used_count: 14,
    limit_per_customer: 2,
    starts_at: '2026-01-01 00:00:00',
    ends_at: '2026-12-31 23:59:59',
    active: 1
  },
  {
    code: 'WELCOME10',
    title: '10% First Order Welcome',
    description: '10% discount for first-time shoppers on carts above ₹500.',
    type: 'percentage',
    value: 10,
    rule_percentage: null,
    rule_flat: null,
    rule_mode: null,
    scope: 'cart',
    scope_values: null,
    min_cart_amount: 50000,
    min_quantity: 1,
    first_order_only: 1,
    stackable: 0,
    priority: 2,
    usage_limit: 1000,
    used_count: 42,
    limit_per_customer: 1,
    starts_at: '2026-01-01 00:00:00',
    ends_at: '2026-12-31 23:59:59',
    active: 1
  },
  {
    code: 'FLAT500',
    title: 'Flat ₹500 Mega Saving',
    description: 'Flat ₹500 instant discount on high-value orders above ₹4,000.',
    type: 'flat',
    value: 50000,
    rule_percentage: null,
    rule_flat: null,
    rule_mode: null,
    scope: 'cart',
    scope_values: null,
    min_cart_amount: 400000,
    min_quantity: 1,
    first_order_only: 0,
    stackable: 1,
    priority: 3,
    usage_limit: 200,
    used_count: 19,
    limit_per_customer: 3,
    starts_at: '2026-01-01 00:00:00',
    ends_at: '2026-12-31 23:59:59',
    active: 1
  },
  {
    code: 'AUDIO15',
    title: '15% Off All Audio Gear',
    description: 'Exclusive 15% off across Headphones, Earbuds, and Speakers.',
    type: 'percentage',
    value: 15,
    rule_percentage: null,
    rule_flat: null,
    rule_mode: null,
    scope: 'categories',
    scope_values: JSON.stringify(['headphones', 'earbuds', 'speakers']),
    min_cart_amount: 150000,
    min_quantity: 1,
    first_order_only: 0,
    stackable: 0,
    priority: 4,
    usage_limit: 300,
    used_count: 27,
    limit_per_customer: 2,
    starts_at: '2026-01-01 00:00:00',
    ends_at: '2026-12-31 23:59:59',
    active: 1
  }
];

const insertDiscount = db.prepare(`
  INSERT INTO discounts (
    code, title, description, type, value, rule_percentage, rule_flat, rule_mode,
    scope, scope_values, min_cart_amount, min_quantity, first_order_only,
    stackable, priority, usage_limit, used_count, limit_per_customer,
    starts_at, ends_at, active
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?
  )
  ON CONFLICT(code) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    type = excluded.type,
    value = excluded.value,
    rule_percentage = excluded.rule_percentage,
    rule_flat = excluded.rule_flat,
    rule_mode = excluded.rule_mode,
    scope = excluded.scope,
    scope_values = excluded.scope_values,
    min_cart_amount = excluded.min_cart_amount,
    min_quantity = excluded.min_quantity,
    first_order_only = excluded.first_order_only,
    stackable = excluded.stackable,
    priority = excluded.priority,
    usage_limit = excluded.usage_limit,
    limit_per_customer = excluded.limit_per_customer,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    active = excluded.active
`);

db.transaction(() => {
  for (const d of sampleDiscounts) {
    insertDiscount.run(
      d.code, d.title, d.description, d.type, d.value, d.rule_percentage, d.rule_flat, d.rule_mode,
      d.scope, d.scope_values, d.min_cart_amount, d.min_quantity, d.first_order_only,
      d.stackable, d.priority, d.usage_limit, d.used_count, d.limit_per_customer,
      d.starts_at, d.ends_at, d.active
    );
  }
})();
console.log('  ✓ Seeded 4 advanced discounts (including "25% or ₹200 whichever is higher")');

// 5. Sample Estimates & Invoices
const rohanCustomer = db.prepare('SELECT id FROM customers WHERE email = ?').get('rohan.varma@gmail.com');
const sampleProduct1 = db.prepare('SELECT * FROM products LIMIT 1 OFFSET 0').get();
const sampleProduct2 = db.prepare('SELECT * FROM products LIMIT 1 OFFSET 4').get();

if (rohanCustomer && sampleProduct1 && sampleProduct2) {
  // Check if estimate already exists
  const existingEst = db.prepare('SELECT id FROM estimates WHERE estimate_number = ?').get('EST-0001');
  if (!existingEst) {
    const estItems = [
      { rate: sampleProduct1.price, quantity: 2, item_name: sampleProduct1.name, product_id: sampleProduct1.id, taxRate: 18, isTaxInclusive: true },
      { rate: sampleProduct2.price, quantity: 1, item_name: sampleProduct2.name, product_id: sampleProduct2.id, taxRate: 18, isTaxInclusive: true }
    ];
    const estTotals = calculateDocumentTotals({ items: estItems, placeOfSupply: 'Karnataka (29)' });

    const insertEst = db.prepare(`
      INSERT INTO estimates (
        estimate_number, customer_id, customer_name, customer_email, customer_phone,
        billing_address, estimate_date, valid_until, status, subtotal, discount_amount,
        tax_amount, shipping_amount, round_off, total, amount_in_words, notes, terms
      ) VALUES (
        'EST-0001', ?, 'Rohan Varma', 'rohan.varma@gmail.com', '+91 98765 43210',
        ?, '2026-11-20', '2026-12-05', 'Draft', ?, 0,
        ?, 0, ?, ?, ?, 'Quotation for bulk workstation audio equipment.',
        '1. Rates valid for 15 days from issue date. 2. 100% advance against proforma invoice.'
      )
    `);

    const estRes = insertEst.run(
      rohanCustomer.id,
      JSON.stringify({ line1: '402, Prestige Palms', city: 'Bengaluru', state: 'Karnataka', pincode: '560066' }),
      estTotals.subtotal,
      estTotals.totalTax,
      estTotals.roundOff,
      estTotals.total,
      estTotals.amountInWords
    );

    const estId = estRes.lastInsertRowid;
    const insertEstItem = db.prepare(`
      INSERT INTO estimate_items (estimate_id, product_id, item_name, quantity, rate, line_total)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const it of estTotals.items) {
      insertEstItem.run(estId, it.product_id, it.item_name, it.quantity, it.rate, it.lineTotal);
    }
    console.log('  ✓ Seeded sample Estimate EST-0001');
  }

  // Sample Invoice INV-2026-0001
  const existingInv = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get('INV-2026-0001');
  if (!existingInv) {
    const invItems = [
      { rate: sampleProduct1.price, quantity: 1, item_name: sampleProduct1.name, product_id: sampleProduct1.id, taxRate: 18, isTaxInclusive: true }
    ];
    const invTotals = calculateDocumentTotals({ items: invItems, placeOfSupply: 'Karnataka (29)' });

    const insertInv = db.prepare(`
      INSERT INTO invoices (
        invoice_number, customer_id, customer_name, customer_email, customer_phone,
        customer_gstin, place_of_supply, billing_address, shipping_address, invoice_date,
        due_date, payment_terms, status, subtotal, discount_amount, taxable_value,
        cgst_amount, sgst_amount, igst_amount, shipping_amount, round_off, total,
        amount_paid, balance_due, amount_in_words, notes, terms, template
      ) VALUES (
        'INV-2026-0001', ?, 'Rohan Varma', 'rohan.varma@gmail.com', '+91 98765 43210',
        '29AABCV9988D1Z2', 'Karnataka (29)', ?, ?, '2026-11-21',
        '2026-11-28', 'Due on receipt', 'Partially paid', ?, 0, ?,
        ?, ?, 0, 0, ?, ?,
        1000, ?, ?, 'Standard retail tax invoice.',
        '1. Goods once sold will be accepted for return within 7 days. 2. Standard manufacturer warranty applies.',
        'standard'
      )
    `);

    const invRes = insertInv.run(
      rohanCustomer.id,
      JSON.stringify({ line1: '402, Prestige Palms', city: 'Bengaluru', state: 'Karnataka', pincode: '560066' }),
      JSON.stringify({ line1: '402, Prestige Palms', city: 'Bengaluru', state: 'Karnataka', pincode: '560066' }),
      invTotals.subtotal,
      invTotals.taxableValue,
      invTotals.cgstAmount,
      invTotals.sgstAmount,
      invTotals.roundOff,
      invTotals.total,
      Math.max(0, invTotals.total - 100000),
      invTotals.amountInWords
    );

    const invId = invRes.lastInsertRowid;
    db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, item_name, quantity, rate, line_total)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(invId, sampleProduct1.id, sampleProduct1.name, 1, sampleProduct1.price, sampleProduct1.price);

    // Record partial payment
    db.prepare(`
      INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
      VALUES (?, 100000, 'upi', '2026-11-21', 'UPI/20261121/981293', 'Advance UPI transfer')
    `).run(invId);

    console.log('  ✓ Seeded sample Invoice INV-2026-0001 with partial payment');
  }
}

// 6. Seed Sample Activity Log entries
const actCount = db.prepare('SELECT COUNT(*) as count FROM activity_log').get();
if (actCount.count === 0) {
  const insertAct = db.prepare(`
    INSERT INTO activity_log (action, entity_type, entity_id, details, undoable, undone)
    VALUES (?, ?, ?, ?, ?, 0)
  `);

  insertAct.run('price_change', 'product', 'image-1', 'Adjusted price from ₹1,299 to ₹999 (-23%)', 1);
  insertAct.run('stock_change', 'product', 'image-3', 'Restocked 10 units via PO-2026-88', 1);
  insertAct.run('create', 'discount', 'FESTIVE25', 'Created discount code FESTIVE25 (25% or ₹200 higher)', 0);
  insertAct.run('create', 'invoice', 'INV-2026-0001', 'Created invoice INV-2026-0001 for Rohan Varma', 0);
  console.log('  ✓ Seeded sample activity log entries with undo capability');
}

console.log('✅ Admin Data Seeding Completed Successfully!\n');
