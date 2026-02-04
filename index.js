import pg from 'pg';
import express from 'express';

const { Pool } = pg;

// --- 1. Set up database connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render provides this automatically in your Environment
  ssl: {
    rejectUnauthorized: false
  }
});

// --- 2. Test DB connection ---
pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL!');
    return client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    .then(() => {
      client.release();
      console.log('Table "posts" is ready!');
    })
    .catch(err => {
      client.release();
      console.error('Error creating table:', err);
    });
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL:', err);
  });

// --- 3. Set up Express server ---
const app = express();
app.use(express.json());

// Example endpoint to fetch posts
app.get('/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example endpoint to add a post
app.post('/posts', async (req, res) => {
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO posts (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SpeedyReadr server running on port ${PORT}`);
});
