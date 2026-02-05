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

// ---------- INIT DB ----------
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
            machine_id TEXT REFERENCES machines(machine_id) ON DELETE CASCADE,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            tech_name TEXT,
            tech_phone TEXT,
            details TEXT,
            parts TEXT,
            downtime NUMERIC DEFAULT 0
        );
    `);

    console.log("Database initialized");
}
initDB().catch(console.error);

// ---------- TECHNICIANS ----------
app.get("/techs", async (_, res) => {
    const r = await pool.query("SELECT * FROM technicians ORDER BY id");
    res.json(r.rows);
});

app.post("/techs", async (req, res) => {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "Missing fields" });

    const r = await pool.query(
        "INSERT INTO technicians (name, phone) VALUES ($1,$2) RETURNING *",
        [name, phone]
    );
    res.json(r.rows[0]);
});

app.put("/techs/:id", async (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;

    const r = await pool.query(
        "UPDATE technicians SET name=$1, phone=$2 WHERE id=$3 RETURNING *",
        [name, phone, id]
    );

    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
});

app.delete("/techs/:id", async (req, res) => {
    await pool.query("DELETE FROM technicians WHERE id=$1", [req.params.id]);
    res.json({ success: true });
});

// ---------- MACHINES ----------
app.get("/machines/:id", async (req, res) => {
    const r = await pool.query(
        "SELECT * FROM machines WHERE machine_id=$1",
        [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
});

app.post("/machines", async (req, res) => {
    const { machine_id, airport, terminal, checkpoint, lane, notes } = req.body;
    try {
        const r = await pool.query(
            `INSERT INTO machines (machine_id, airport, terminal, checkpoint, lane, notes)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [machine_id, airport, terminal, checkpoint, lane, notes]
        );
        res.json(r.rows[0]);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put("/machines/:id", async (req, res) => {
    const { airport, terminal, checkpoint, lane, notes } = req.body;

    const r = await pool.query(
        `UPDATE machines
         SET airport=$1, terminal=$2, checkpoint=$3, lane=$4, notes=$5
         WHERE machine_id=$6 RETURNING *`,
        [airport, terminal, checkpoint, lane, notes, req.params.id]
    );

    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
});

app.delete("/machines/:id", async (req, res) => {
    const id = req.params.id;

    await pool.query("DELETE FROM service_logs WHERE machine_id=$1", [id]);
    await pool.query("DELETE FROM machines WHERE machine_id=$1", [id]);

    res.json({ success: true });
});

// ---------- SERVICE LOGS ----------
app.get("/logs/:machine_id", async (req, res) => {
    const r = await pool.query(
        "SELECT * FROM service_logs WHERE machine_id=$1 ORDER BY date DESC",
        [req.params.machine_id]
    );
    res.json(r.rows);
});

app.post("/logs", async (req, res) => {
    const { machine_id, tech_name, tech_phone, details, parts, downtime } = req.body;

    const r = await pool.query(
        `INSERT INTO service_logs
         (machine_id, tech_name, tech_phone, details, parts, downtime)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [machine_id, tech_name, tech_phone, details, parts, downtime || 0]
    );

    res.json(r.rows[0]);
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servi-Sync API running on port ${PORT}`);
});
