import '../config/env.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 TechBazaar Server running on port ${PORT}`);
    console.log(`   Client URL: ${CLIENT_URL}`);
    console.log(`   Database: SQLite (techbazaar.db) ready`);
  });

  // Event loop keep-alive
  setInterval(() => {}, 1000 * 60 * 60);
}
