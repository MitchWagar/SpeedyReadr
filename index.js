// index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

// --- APP SETUP ---
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- DATABASE SETUP ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render provides this if using Postgres
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Create table if it doesn't exist
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                machine_id TEXT NOT NULL,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tech_name TEXT,
                tech_phone TEXT,
                details TEXT,
                parts TEXT,
                downtime NUMERIC,
                location JSONB
            )
        `);
        console.log("Database initialized!");
    } catch (err) {
        console.error("DB init error:", err);
    }
}

initDB();

// --- ROUTES ---
app.get("/", (req, res) => {
    res.send("SpeedyReadr API is running");
});

// Get all logs for a machine
app.get("/logs/:machineId", async (req, res) => {
    const { machineId } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM posts WHERE machine_id=$1 ORDER BY date DESC",
            [machineId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// Add a log
app.post("/logs", async (req, res) => {
    const { machine_id, tech_name, tech_phone, details, parts, downtime, location } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO posts (machine_id, tech_name, tech_phone, details, parts, downtime, location)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [machine_id, tech_name, tech_phone, details, parts, downtime, location || {}]
        );
        res.json({ success: true, log: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save log" });
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`SpeedyReadr server running on port ${PORT}`);
});
