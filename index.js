// index.js
import express from "express";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 10000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // make sure DATABASE_URL is set in Render
  ssl: {
    rejectUnauthorized: false, // required for Render PostgreSQL
  },
});

// Test DB connection and create table
async function initDB() {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL!");

    // Create posts table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT
      )
    `);
    console.log('Table "posts" is ready!');

    client.release();
  } catch (err) {
    console.error("Failed to connect to PostgreSQL:", err);
  }
}

// Routes
app.get("/", (req, res) => {
  res.send("SpeedyReadr is live!");
});

app.get("/posts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM posts ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`SpeedyReadr server running on port ${PORT}`);
  await initDB();
});
