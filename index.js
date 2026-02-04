// index.js
import pkg from 'pg';
import http from 'http';

const { Pool } = pkg;

// Connect to your database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create a table if it doesn't exist
async function setupDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "posts" is ready!');
  } catch (err) {
    console.error('Error creating table:', err);
  }
}

// Test database connection
async function testDb() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected! Current time:', res.rows[0].now);
  } catch (err) {
    console.error('Database connection error:', err);
  }
}

// Call both functions at startup
(async () => {
  await testDb();
  await setupDatabase();
})();

// Basic HTTP server so Render can keep the service alive
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SpeedyReadr is running!\n');
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

