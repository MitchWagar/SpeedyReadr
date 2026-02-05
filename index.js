// index.js (server-side changes)
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
    res.json(result.rows); // returns flat array [{id,name,phone}, ...]
});

app.post("/techs", async (req, res) => {
    const { name, phone } = req.body;
    if(!name || !phone) return res.status(400).json({ error: "Name and phone required" });
    const result = await pool.query(
        "INSERT INTO technicians (name, phone) VALUES ($1, $2) RETURNING *",
        [name, phone]
    );
    res.json(result.rows[0]);
});

// Add PUT endpoint for editing technicians
app.put("/techs/:id", async (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;
    if(!name || !phone) return res.status(400).json({ error: "Name and phone required" });
    
    try {
        const result = await pool.query(
            "UPDATE technicians SET name=$1, phone=$2 WHERE id=$3 RETURNING *",
            [name, phone, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Technician not found" });
        }
        res.json(result.rows[0]);
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

// Add DELETE endpoint for deleting technicians
app.delete("/techs/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query("DELETE FROM technicians WHERE id=$1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Technician not found" });
        }
        res.json({ message: "Technician deleted successfully" });
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

// ---------- MACHINES ----------
app.get("/machines", async (req, res) => {
    const result = await pool.query("SELECT * FROM machines ORDER BY machine_id ASC");
    res.json(result.rows);
});

app.get("/machines/:id", async (req, res) => {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM machines WHERE machine_id=$1", [id]);
    if(result.rows.length === 0) return res.status(404).json({ error: "Machine not found" });
    res.json(result.rows[0]);
});

app.post("/machines", async (req, res) => {
    const { machine_id, airport, terminal, checkpoint, lane, notes } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO machines (machine_id, airport, terminal, checkpoint, lane, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [machine_id, airport, terminal, checkpoint, lane, notes]
        );
        res.json(result.rows[0]);
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

// Add PUT endpoint for editing machines
app.put("/machines/:id", async (req, res) => {
    const { id } = req.params;
    const { airport, terminal, checkpoint, lane, notes } = req.body;
    
    try {
        const result = await pool.query(
            `UPDATE machines SET airport=$1, terminal=$2, checkpoint=$3, lane=$4, notes=$5 WHERE machine_id=$6 RETURNING *`,
            [airport, terminal, checkpoint, lane, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Machine not found" });
        }
        res.json(result.rows[0]);
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

// Add DELETE endpoint for deleting machines
app.delete("/machines/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query("DELETE FROM machines WHERE machine_id=$1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Machine not found" });
        }
        res.json({ message: "Machine deleted successfully" });
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
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
    try {
        const result = await pool.query(
            `INSERT INTO service_logs (machine_id, tech_name, tech_phone, details, parts, downtime) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [machine_id, tech_name, tech_phone, details, parts, downtime || 0]
        );
        res.json(result.rows[0]);
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

// ---------- SERVICE LOGS (ADMIN ONLY) ----------
app.delete("/logs/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query("DELETE FROM service_logs WHERE id=$1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Service log not found" });
        }
        res.json({ message: "Service log deleted successfully" });
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servi-Sync server running on port ${PORT}`));
