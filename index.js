// index.js
import pkg from 'pg';
import http from 'http';

const { Pool } = pkg;

// Create a connection pool using your DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Simple function to test database connection
async function testDb() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected! Current time:', res.rows[0].now);
  } catch (err) {
    console.error('Database connection error:', err);
  }
}

// Call testDb once at startup
testDb();

// Basic HTTP server so Render can keep the service alive
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SpeedyReadr is running!\n');
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
