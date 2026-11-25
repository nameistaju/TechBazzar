import { Router } from 'express';
import dedupRoutes from './dedupRoutes.js';
import crudRoutes from './crudRoutes.js';

const router = Router();
router.use(dedupRoutes);
router.use(crudRoutes);

export default router;
