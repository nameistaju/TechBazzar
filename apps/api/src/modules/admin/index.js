import { Router } from 'express';
import { requireAdmin } from '../../core/middleware/auth.js';
import profileRoutes from './profile/routes.js';
import analyticsRoutes from './analytics/routes.js';
import productsRoutes from './products/routes.js';
import inventoryRoutes from './inventory/routes.js';
import ordersRoutes from './orders/routes.js';
import discountsRoutes from './discounts/routes.js';
import estimatesRoutes from './estimates/routes.js';
import invoicesRoutes from './invoices/routes.js';
import customersRoutes from './customers/routes.js';
import reportsRoutes from './reports/routes.js';
import settingsRoutes from './settings/routes.js';
import bannersRoutes from './banners/routes.js';
import quotesRoutes from './quotes/routes.js';
import wholesaleRoutes from './wholesale/routes.js';

const router = Router();

// Protect all admin routes
router.use(requireAdmin);

router.use(profileRoutes);
router.use(analyticsRoutes);
router.use(productsRoutes);
router.use(inventoryRoutes);
router.use(ordersRoutes);
router.use(discountsRoutes);
router.use(estimatesRoutes);
router.use(invoicesRoutes);
router.use(customersRoutes);
router.use(reportsRoutes);
router.use(settingsRoutes);
router.use(bannersRoutes);
router.use(quotesRoutes);
router.use(wholesaleRoutes);

export default router;
