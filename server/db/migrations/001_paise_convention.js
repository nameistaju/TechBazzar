import db from '../index.js';

export const MIGRATION_ID = '001_paise_convention';

export function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function scaleQuoteItems(itemsJson, factor) {
  if (!itemsJson) return itemsJson;
  try {
    const arr = JSON.parse(itemsJson);
    if (!Array.isArray(arr)) return itemsJson;
    const scaled = arr.map((it) => ({
      ...it,
      targetPrice: it.targetPrice != null ? Math.round(Number(it.targetPrice) * factor) : it.targetPrice
    }));
    return JSON.stringify(scaled);
  } catch {
    return itemsJson;
  }
}

export function up() {
  ensureMigrationsTable();
  const already = db.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(MIGRATION_ID);
  if (already) {
    return { applied: false, message: 'Migration already applied' };
  }

  const run = db.transaction(() => {
    // 1. products (all money columns from rupees -> paise)
    db.prepare(`
      UPDATE products SET
        price = CASE WHEN price IS NOT NULL THEN ROUND(price * 100) ELSE NULL END,
        original_price = CASE WHEN original_price IS NOT NULL THEN ROUND(original_price * 100) ELSE NULL END,
        cost_price = CASE WHEN cost_price IS NOT NULL THEN ROUND(cost_price * 100) ELSE NULL END,
        mrp = CASE WHEN mrp IS NOT NULL THEN ROUND(mrp * 100) ELSE NULL END,
        sale_price = CASE WHEN sale_price IS NOT NULL THEN ROUND(sale_price * 100) ELSE NULL END,
        tier1_price = CASE WHEN tier1_price IS NOT NULL THEN ROUND(tier1_price * 100) ELSE NULL END,
        tier2_price = CASE WHEN tier2_price IS NOT NULL THEN ROUND(tier2_price * 100) ELSE NULL END,
        tier3_price = CASE WHEN tier3_price IS NOT NULL THEN ROUND(tier3_price * 100) ELSE NULL END,
        tier4_price = CASE WHEN tier4_price IS NOT NULL THEN ROUND(tier4_price * 100) ELSE NULL END,
        suggested_retail_price = CASE WHEN suggested_retail_price IS NOT NULL THEN ROUND(suggested_retail_price * 100) ELSE NULL END
    `).run();

    // 2. orders
    db.prepare(`
      UPDATE orders SET
        subtotal = ROUND(COALESCE(subtotal, 0) * 100),
        shipping = ROUND(COALESCE(shipping, 0) * 100),
        total = ROUND(COALESCE(total, 0) * 100),
        discount_amount = ROUND(COALESCE(discount_amount, 0) * 100),
        advance_amount = ROUND(COALESCE(advance_amount, 0) * 100),
        balance_amount = ROUND(COALESCE(balance_amount, 0) * 100)
    `).run();

    // 3. order_items
    db.prepare(`
      UPDATE order_items SET
        price = ROUND(COALESCE(price, 0) * 100),
        unit_price = ROUND(COALESCE(unit_price, 0) * 100),
        tax_amount = ROUND(COALESCE(tax_amount, 0) * 100)
    `).run();

    // 4. invoices
    db.prepare(`
      UPDATE invoices SET
        subtotal = ROUND(COALESCE(subtotal, 0) * 100),
        discount_amount = ROUND(COALESCE(discount_amount, 0) * 100),
        taxable_value = ROUND(COALESCE(taxable_value, 0) * 100),
        cgst_amount = ROUND(COALESCE(cgst_amount, 0) * 100),
        sgst_amount = ROUND(COALESCE(sgst_amount, 0) * 100),
        igst_amount = ROUND(COALESCE(igst_amount, 0) * 100),
        shipping_amount = ROUND(COALESCE(shipping_amount, 0) * 100),
        round_off = ROUND(COALESCE(round_off, 0) * 100),
        total = ROUND(COALESCE(total, 0) * 100),
        amount_paid = ROUND(COALESCE(amount_paid, 0) * 100),
        balance_due = ROUND(COALESCE(balance_due, 0) * 100)
    `).run();

    // 5. invoice_items
    db.prepare(`
      UPDATE invoice_items SET
        rate = ROUND(COALESCE(rate, 0) * 100),
        discount_amount = ROUND(COALESCE(discount_amount, 0) * 100),
        tax_amount = ROUND(COALESCE(tax_amount, 0) * 100),
        line_total = ROUND(COALESCE(line_total, 0) * 100)
    `).run();

    // 6. estimates
    db.prepare(`
      UPDATE estimates SET
        subtotal = ROUND(COALESCE(subtotal, 0) * 100),
        discount_amount = ROUND(COALESCE(discount_amount, 0) * 100),
        tax_amount = ROUND(COALESCE(tax_amount, 0) * 100),
        shipping_amount = ROUND(COALESCE(shipping_amount, 0) * 100),
        round_off = ROUND(COALESCE(round_off, 0) * 100),
        total = ROUND(COALESCE(total, 0) * 100)
    `).run();

    // 7. estimate_items
    db.prepare(`
      UPDATE estimate_items SET
        rate = ROUND(COALESCE(rate, 0) * 100),
        discount_amount = ROUND(COALESCE(discount_amount, 0) * 100),
        tax_amount = ROUND(COALESCE(tax_amount, 0) * 100),
        line_total = ROUND(COALESCE(line_total, 0) * 100)
    `).run();

    // 8. discounts (value only when type = 'flat'; rule_flat and min_cart_amount always)
    db.prepare(`
      UPDATE discounts SET
        value = CASE WHEN type = 'flat' THEN ROUND(COALESCE(value, 0) * 100) ELSE value END,
        rule_flat = CASE WHEN rule_flat IS NOT NULL THEN ROUND(rule_flat * 100) ELSE NULL END,
        min_cart_amount = CASE WHEN min_cart_amount IS NOT NULL THEN ROUND(min_cart_amount * 100) ELSE 0 END
    `).run();

    // 9. payments
    db.prepare(`
      UPDATE payments SET amount = ROUND(COALESCE(amount, 0) * 100)
    `).run();

    // 10. quote_requests
    const quotes = db.prepare('SELECT id, target_price, items FROM quote_requests').all();
    const updateQuote = db.prepare('UPDATE quote_requests SET target_price = ?, items = ? WHERE id = ?');
    for (const q of quotes) {
      updateQuote.run(
        q.target_price != null ? Math.round(q.target_price * 100) : null,
        scaleQuoteItems(q.items, 100),
        q.id
      );
    }

    // 11. price_lists & users.credit_limit_override
    db.prepare(`
      UPDATE price_lists SET custom_price = ROUND(COALESCE(custom_price, 0) * 100)
    `).run();
    db.prepare(`
      UPDATE users SET credit_limit_override = ROUND(credit_limit_override * 100)
      WHERE credit_limit_override IS NOT NULL
    `).run();

    // 12. settings money keys
    const moneySettings = ['min_order_value', 'free_shipping_threshold', 'wholesale_default_mov', 'wholesale_default_free_shipping'];
    const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
    const setSetting = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
    for (const key of moneySettings) {
      const row = getSetting.get(key);
      if (row && row.value !== null && !isNaN(Number(row.value))) {
        setSetting.run(String(Math.round(Number(row.value) * 100)), key);
      }
    }

    // Note: wholesale_groups (min_order_value, free_shipping_threshold, credit_limit) is already in paise.
    db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(MIGRATION_ID);
  });

  run();
  return { applied: true, message: 'Converted all rupee columns to integer paise' };
}

export function down() {
  ensureMigrationsTable();
  const already = db.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(MIGRATION_ID);
  if (!already) {
    return { rolledBack: false, message: 'Migration not applied' };
  }

  const run = db.transaction(() => {
    db.prepare(`
      UPDATE products SET
        price = CASE WHEN price IS NOT NULL THEN ROUND(price / 100.0) ELSE NULL END,
        original_price = CASE WHEN original_price IS NOT NULL THEN ROUND(original_price / 100.0) ELSE NULL END,
        cost_price = CASE WHEN cost_price IS NOT NULL THEN ROUND(cost_price / 100.0) ELSE NULL END,
        mrp = CASE WHEN mrp IS NOT NULL THEN ROUND(mrp / 100.0) ELSE NULL END,
        sale_price = CASE WHEN sale_price IS NOT NULL THEN ROUND(sale_price / 100.0) ELSE NULL END,
        tier1_price = CASE WHEN tier1_price IS NOT NULL THEN ROUND(tier1_price / 100.0) ELSE NULL END,
        tier2_price = CASE WHEN tier2_price IS NOT NULL THEN ROUND(tier2_price / 100.0) ELSE NULL END,
        tier3_price = CASE WHEN tier3_price IS NOT NULL THEN ROUND(tier3_price / 100.0) ELSE NULL END,
        tier4_price = CASE WHEN tier4_price IS NOT NULL THEN ROUND(tier4_price / 100.0) ELSE NULL END,
        suggested_retail_price = CASE WHEN suggested_retail_price IS NOT NULL THEN ROUND(suggested_retail_price / 100.0) ELSE NULL END
    `).run();

    db.prepare(`
      UPDATE orders SET
        subtotal = ROUND(COALESCE(subtotal, 0) / 100.0),
        shipping = ROUND(COALESCE(shipping, 0) / 100.0),
        total = ROUND(COALESCE(total, 0) / 100.0),
        discount_amount = ROUND(COALESCE(discount_amount, 0) / 100.0),
        advance_amount = ROUND(COALESCE(advance_amount, 0) / 100.0),
        balance_amount = ROUND(COALESCE(balance_amount, 0) / 100.0)
    `).run();

    db.prepare(`
      UPDATE order_items SET
        price = ROUND(COALESCE(price, 0) / 100.0),
        unit_price = ROUND(COALESCE(unit_price, 0) / 100.0),
        tax_amount = ROUND(COALESCE(tax_amount, 0) / 100.0)
    `).run();

    db.prepare(`
      UPDATE invoices SET
        subtotal = ROUND(COALESCE(subtotal, 0) / 100.0),
        discount_amount = ROUND(COALESCE(discount_amount, 0) / 100.0),
        taxable_value = ROUND(COALESCE(taxable_value, 0) / 100.0),
        cgst_amount = ROUND(COALESCE(cgst_amount, 0) / 100.0),
        sgst_amount = ROUND(COALESCE(sgst_amount, 0) / 100.0),
        igst_amount = ROUND(COALESCE(igst_amount, 0) / 100.0),
        shipping_amount = ROUND(COALESCE(shipping_amount, 0) / 100.0),
        round_off = ROUND(COALESCE(round_off, 0) / 100.0),
        total = ROUND(COALESCE(total, 0) / 100.0),
        amount_paid = ROUND(COALESCE(amount_paid, 0) / 100.0),
        balance_due = ROUND(COALESCE(balance_due, 0) / 100.0)
    `).run();

    db.prepare(`
      UPDATE invoice_items SET
        rate = ROUND(COALESCE(rate, 0) / 100.0),
        discount_amount = ROUND(COALESCE(discount_amount, 0) / 100.0),
        tax_amount = ROUND(COALESCE(tax_amount, 0) / 100.0),
        line_total = ROUND(COALESCE(line_total, 0) / 100.0)
    `).run();

    db.prepare(`
      UPDATE estimates SET
        subtotal = ROUND(COALESCE(subtotal, 0) / 100.0),
        discount_amount = ROUND(COALESCE(discount_amount, 0) / 100.0),
        tax_amount = ROUND(COALESCE(tax_amount, 0) / 100.0),
        shipping_amount = ROUND(COALESCE(shipping_amount, 0) / 100.0),
        round_off = ROUND(COALESCE(round_off, 0) / 100.0),
        total = ROUND(COALESCE(total, 0) / 100.0)
    `).run();

    db.prepare(`
      UPDATE estimate_items SET
        rate = ROUND(COALESCE(rate, 0) / 100.0),
        discount_amount = ROUND(COALESCE(discount_amount, 0) / 100.0),
        tax_amount = ROUND(COALESCE(tax_amount, 0) / 100.0),
        line_total = ROUND(COALESCE(line_total, 0) / 100.0)
    `).run();

    db.prepare(`
      UPDATE discounts SET
        value = CASE WHEN type = 'flat' THEN ROUND(COALESCE(value, 0) / 100.0) ELSE value END,
        rule_flat = CASE WHEN rule_flat IS NOT NULL THEN ROUND(rule_flat / 100.0) ELSE NULL END,
        min_cart_amount = CASE WHEN min_cart_amount IS NOT NULL THEN ROUND(min_cart_amount / 100.0) ELSE 0 END
    `).run();

    db.prepare(`UPDATE payments SET amount = ROUND(COALESCE(amount, 0) / 100.0)`).run();

    const quotes = db.prepare('SELECT id, target_price, items FROM quote_requests').all();
    const updateQuote = db.prepare('UPDATE quote_requests SET target_price = ?, items = ? WHERE id = ?');
    for (const q of quotes) {
      updateQuote.run(
        q.target_price != null ? Math.round(q.target_price / 100) : null,
        scaleQuoteItems(q.items, 0.01),
        q.id
      );
    }

    db.prepare(`UPDATE price_lists SET custom_price = ROUND(COALESCE(custom_price, 0) / 100.0)`).run();
    db.prepare(`UPDATE users SET credit_limit_override = ROUND(credit_limit_override / 100.0) WHERE credit_limit_override IS NOT NULL`).run();

    const moneySettings = ['min_order_value', 'free_shipping_threshold', 'wholesale_default_mov', 'wholesale_default_free_shipping'];
    const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
    const setSetting = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
    for (const key of moneySettings) {
      const row = getSetting.get(key);
      if (row && row.value !== null && !isNaN(Number(row.value))) {
        setSetting.run(String(Math.round(Number(row.value) / 100)), key);
      }
    }

    db.prepare('DELETE FROM schema_migrations WHERE id = ?').run(MIGRATION_ID);
  });

  run();
  return { rolledBack: true, message: 'Rolled back paise migration to rupees' };
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('001_paise_convention.js')) {
  const isRollback = process.argv.includes('--rollback');
  const result = isRollback ? down() : up();
  console.log(JSON.stringify(result));
}
