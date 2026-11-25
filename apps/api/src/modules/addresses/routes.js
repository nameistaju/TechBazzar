import { Router } from 'express';
import { z } from 'zod';
import db from '../../../db/index.js';
import { requireAuth } from '../../core/middleware/auth.js';
import { validateBody } from '../../core/middleware/validate.js';

const router = Router();

const addressSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  addressLine: z.string().min(3, 'Address line is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit PIN code is required'),
  isDefault: z.boolean().optional().default(false)
});

// All address routes require authentication
router.use(requireAuth);

// GET /api/addresses
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM addresses 
    WHERE user_id = ?
    ORDER BY is_default DESC, created_at DESC
  `).all(req.user.id);

  return res.json({
    data: {
      addresses: rows.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        addressLine: r.address_line,
        city: r.city,
        state: r.state,
        pincode: r.pincode,
        isDefault: Boolean(r.is_default)
      }))
    },
    error: null
  });
});

// POST /api/addresses
router.post('/', validateBody(addressSchema), (req, res) => {
  const { name, phone, addressLine, city, state, pincode, isDefault } = req.body;

  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }

  const result = db.prepare(`
    INSERT INTO addresses (user_id, name, phone, address_line, city, state, pincode, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name.trim(), phone.trim(), addressLine.trim(), city.trim(), state.trim(), pincode.trim(), isDefault ? 1 : 0);

  return res.status(201).json({
    data: {
      address: {
        id: result.lastInsertRowid,
        name,
        phone,
        addressLine,
        city,
        state,
        pincode,
        isDefault
      }
    },
    error: null
  });
});

// PATCH /api/addresses/:id/default
router.patch('/:id/default', (req, res) => {
  const addressId = req.params.id;
  const exists = db.prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?').get(addressId, req.user.id);

  if (!exists) {
    return res.status(404).json({ data: null, error: 'Address not found' });
  }

  db.transaction(() => {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(addressId);
  })();

  return res.json({ data: { success: true }, error: null });
});

// DELETE /api/addresses/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ data: null, error: 'Address not found' });
  }

  return res.json({ data: { success: true }, error: null });
});

export default router;
