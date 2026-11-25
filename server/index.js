import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';

import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import addressesRoutes from './routes/addresses.js';
import adminRoutes from './routes/admin.js';
import miscRoutes from './routes/misc.js';
import bannersRoutes from './routes/banners.js';
import quotesRoutes from './routes/quotes.js';
import wholesaleRoutes from './routes/wholesale.js';
import brandingRoutes from './routes/branding.js';
import { errorHandler } from './middleware/error.js';
import { getJwtSecret } from './middleware/auth.js';

// Validate JWT secret on startup (refuses to boot in production without strong JWT_SECRET)
getJwtSecret();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Security Headers with Helmet + CSP
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: null
    }
  }
}));

// CORS Configuration
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true
}));

// Parsers
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting (120 req/minute)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: 'Too many requests. Please slow down.' }
});

app.use('/api', apiLimiter);

// Serve uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'healthy', timestamp: new Date().toISOString() }, error: null });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/wholesale', wholesaleRoutes);
app.use('/api', brandingRoutes);
app.use('/api', miscRoutes);

// Fallback 404 for unhandled API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({ data: null, error: `API route ${req.method} ${req.originalUrl} not found` });
});

// Serve production SPA build & fallback if dist/ exists
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Central Error Handler
app.use(errorHandler);

// Start Server (skip listening during Vitest/Supertest imports)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 TechBazaar Server running on port ${PORT}`);
    console.log(`   Client URL: ${CLIENT_URL}`);
    console.log(`   Database: SQLite (techbazaar.db) ready`);
  });

  // Event loop keep-alive
  setInterval(() => {}, 1000 * 60 * 60);
}

export default app;
