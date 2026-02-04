import express from 'express';
import pg from 'pg';
import path from 'path';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 10000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve('./'))); // serve index.html from root

// Initialize table
pool.query(`
  CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  )
`)
  .then(() => console.log('Table "posts" is ready!'))
  .catch(err => console.error('Error creating table:', err));

// Routes

// Get all posts
app.get('/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Add a new post
app.post('/posts', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Missing title or content' });

  try {
    const result = await pool.query(
      'INSERT INTO posts(title, content) VALUES($1, $2) RETURNING *',
      [title, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// Serve index.html at /
app.get('/', (req, res) => {
  res.sendFile(path.resolve('./index.html'));
});

// Start server
app.listen(PORT, () => console.log(`SpeedyReadr server running on port ${PORT}`));
