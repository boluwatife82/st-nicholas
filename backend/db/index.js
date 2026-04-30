// db/index.js
// PostgreSQL connection pool using the pg library.
// All routes import this and call pool.query() to talk to the database.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 10,           // max 10 simultaneous connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Test the connection when the server starts
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL (Supabase)');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
});

module.exports = pool;
