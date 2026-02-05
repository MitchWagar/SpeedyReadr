// index.js
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- DATABASE ----------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ---------- CREATE TABLES ----------
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS technicians (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            UNIQUE(name, phone)
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
            machine_id TEXT NOT NULL REFERENCES machines(machine_id) ON DELETE CASCADE,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            tech_name TEXT NOT NULL,
            tech_phone TEXT NOT NULL,
            details TEXT NOT NULL,
            parts TEXT,
            downtime NUMERIC DEFAULT 0
        );
    `);

    console.log("Database initialized!");
}

initDB().catch(console.error);

// ---------- TECHNICIANS ----------
app.get("/techs", async (req, res) => {
    const result = await pool.query(
        "SELECT id, name, phone FROM technicians ORDER BY id ASC"
    );
    res.json(result.rows);
});

app.post("/techs", async (req, res) => {
    const { name, phone } = req.body;
    if (!name || !phone) {
        return res.status(400).json({ error: "Name and phone are required" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO technicians (name, phone) VALUES ($1, $2) RETURNING *",
            [name, phone]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: "Technician already exists" });
    }
});

// ---------- MACHINES ----------
app.get("/machines/:id", async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
        "SELECT * FROM machines WHERE machine_id=$1",
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: "Machine not found" });
    }

    res.json(result.rows[0]);
});

app.post("/machines", async (req, res) => {
    const { machine_id, airport, terminal, checkpoint, lane, notes } = req.body;
    if (!machine_id) {
        return res.status(400).json({ error: "Machine ID required" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO machines (machine_id, airport, terminal, checkpoint, lane, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
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
        `UPDATE machines
         SET airport=$1, terminal=$2, checkpoint=$3, lane=$4, notes=$5
         WHERE machine_id=$6
         RETURNING *`,
        [airport, terminal, checkpoint, lane, notes, id]
    );

    res.json(result.rows[0]);
});

// ---------- SERVICE LOGS ----------
app.get("/logs/:machine_id", async (req, res) => {
    const { machine_id } = req.params;

    const result = await pool.query(
        `SELECT * FROM service_logs
         WHERE machine_id=$1
         ORDER BY date DESC`,
        [machine_id]
    );

    res.json(result.rows);
});

app.post("/logs", async (req, res) => {
    const { machine_id, tech_name, tech_phone, details, parts, downtime } = req.body;

    // --- HARD VALIDATION ---
    if (!machine_id || !tech_name || !tech_phone || !details) {
        return res.status(400).json({
            error: "machine_id, tech_name, tech_phone, and details are required"
        });
    }

    // Ensure technician exists
    const techCheck = await pool.query(
        "SELECT id FROM technicians WHERE name=$1 AND phone=$2",
        [tech_name, tech_phone]
    );

    if (techCheck.rows.length === 0) {
        return res.status(403).json({
            error: "Invalid technician. Technician must exist."
        });
    }

    // Ensure machine exists
    const machineCheck = await pool.query(
        "SELECT id FROM machines WHERE machine_id=$1",
        [machine_id]
    );

    if (machineCheck.rows.length === 0) {
        return res.status(404).json({
            error: "Machine does not exist"
        });
    }

    // Insert service log
    const result = await pool.query(
        `INSERT INTO service_logs
         (machine_id, tech_name, tech_phone, details, parts, downtime)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [machine_id, tech_name, tech_phone, details, parts || "", downtime || 0]
    );

    res.json(result.rows[0]);
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
    console.log(`Servi-Sync server running on port ${PORT}`)
);
