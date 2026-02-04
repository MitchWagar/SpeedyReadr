// index.js
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- DATABASE ----------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // your Render PostgreSQL URL
    ssl: { rejectUnauthorized: false } // needed on Render
});

// ---------- CREATE TABLES ----------
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS technicians (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS machines (
            id SERIAL PRIMARY KEY,
            machine_id TEXT UNIQUE NOT NULL,
            airport TEXT,
            terminal TEXT,
            checkpoint TEXT,
            lane TEXT,
            notes TEXT
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS service_logs (
            id SERIAL PRIMARY KEY,
            machine_id TEXT REFERENCES machines(machine_id),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            tech_name TEXT,
            tech_phone TEXT,
            details TEXT,
            parts TEXT,
            downtime NUMERIC DEFAULT 0
        );
    `);

    console.log("Database initialized!");
}
initDB().catch(console.error);

// ---------- TECHNICIANS ----------
app.get("/techs", async (req, res) => {
    const result = await pool.query("SELECT * FROM technicians ORDER BY id ASC");
    res.json(result.rows);
});

app.post("/techs", async (req, res) => {
    const { name, phone } = req.body;
    const result = await pool.query(
        "INSERT INTO technicians (name, phone) VALUES ($1, $2) RETURNING *",
        [name, phone]
    );
    res.json(result.rows[0]);
});

// ---------- MACHINES ----------
app.get("/machines/:id", async (req, res) => {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM machines WHERE machine_id=$1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Machine not found" });
    res.json(result.rows[0]);
});

app.post("/machines", async (req, res) => {
    const { machine_id, airport, terminal, checkpoint, lane, notes } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO machines (machine_id, airport, terminal, checkpoint, lane, notes)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [machine_id, airport, terminal, checkpoint, lane, notes]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put("/machines/:id/location", async (req, res) => {
    const { id } = req.params;
    const { airport, terminal, checkpoint, lane, notes } = req.body;
    const result = await pool.query(
        `UPDATE machines SET airport=$1, terminal=$2, checkpoint=$3, lane=$4, notes=$5
         WHERE machine_id=$6 RETURNING *`,
        [airport, terminal, checkpoint, lane, notes, id]
    );
    res.json(result.rows[0]);
});

// ---------- SERVICE LOGS ----------
app.get("/logs/:machine_id", async (req, res) => {
    const { machine_id } = req.params;
    const result = await pool.query(
        "SELECT * FROM service_logs WHERE machine_id=$1 ORDER BY date DESC",
        [machine_id]
    );
    res.json(result.rows);
});

app.post("/logs", async (req, res) => {
    const { machine_id, tech_name, tech_phone, details, parts, downtime } = req.body;
    const result = await pool.query(
        `INSERT INTO service_logs (machine_id, tech_name, tech_phone, details, parts, downtime)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [machine_id, tech_name, tech_phone, details, parts, downtime || 0]
    );
    res.json(result.rows[0]);
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`SpeedyReadr server running on port ${PORT}`));
