import db from '../../../db/index.js';

export function logActivity(action, entityType, entityId, details, beforeState = null, afterState = null, undoable = false) {
  try {
    const stmt = db.prepare(`
      INSERT INTO activity_log (action, entity_type, entity_id, details, before_state, after_state, undoable, undone)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    stmt.run(
      action,
      entityType,
      String(entityId),
      details,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      undoable ? 1 : 0
    );
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

export function getNextSequence(name, prefix = '', padLength = 4) {
  const nextVal = db.transaction(() => {
    let current = db.prepare('SELECT current_value FROM counters WHERE name = ?').get(name);
    let val = current ? current.current_value : 1;

    if (name === 'invoice') {
      const existing = db.prepare('SELECT invoice_number FROM invoices').all();
      for (const row of existing) {
        if (row.invoice_number && row.invoice_number.startsWith(prefix)) {
          const numPart = parseInt(row.invoice_number.slice(prefix.length), 10);
          if (!isNaN(numPart) && numPart >= val) {
            val = numPart + 1;
          }
        }
      }
    } else if (name === 'estimate') {
      const existing = db.prepare('SELECT estimate_number FROM estimates').all();
      for (const row of existing) {
        if (row.estimate_number && row.estimate_number.startsWith(prefix)) {
          const numPart = parseInt(row.estimate_number.slice(prefix.length), 10);
          if (!isNaN(numPart) && numPart >= val) {
            val = numPart + 1;
          }
        }
      }
    }

    db.prepare(`
      INSERT INTO counters (name, current_value) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET current_value = ?
    `).run(name, val + 1, val + 1);
    return val;
  })();

  return `${prefix}${String(nextVal).padStart(padLength, '0')}`;
}

export function getSettingsMap() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}
