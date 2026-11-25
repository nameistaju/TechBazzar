import db from '../db/index.js';

export function idempotencyMiddleware(req, res, next) {
  const key = req.get('Idempotency-Key')?.trim();
  if (!key) return next();

  const scopedKey = `${req.method}:${req.baseUrl}${req.path}:${key}`;
  try {
    const existing = db.prepare('SELECT response_status, response_body FROM idempotency_keys WHERE key = ?').get(scopedKey);
    if (existing) {
      return res.status(existing.response_status).json(JSON.parse(existing.response_body));
    }
  } catch {
    // Fall through if lookup fails
  }

  const origJson = res.json.bind(res);
  res.json = (body) => {
    try {
      if (res.statusCode >= 200 && res.statusCode < 500) {
        db.prepare(`
          INSERT OR IGNORE INTO idempotency_keys (key, response_status, response_body)
          VALUES (?, ?, ?)
        `).run(scopedKey, res.statusCode, JSON.stringify(body));
      }
    } catch {
      // Non-fatal
    }
    return origJson(body);
  };

  return next();
}
