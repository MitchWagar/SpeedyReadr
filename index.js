// app.js
const API = "https://speedyreadr.onrender.com"; // Replace with your Render URL
let role = "", currentMachine = "", loggedTech = null, scanner = null;

// ---------- TECH MANAGEMENT ----------
async function getTechs() {
    const res = await fetch(API + "/techs");
    return await res.json();
}

async function addTechnician() {
    const name = document.getElementById("newTechName").value;
    const phone = document.getElementById("newTechPhone").value;
    if (!name || !phone) return alert("Name and phone required");

    const res = await fetch(API + "/techs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone })
    });
    const data = await res.json();
    alert("Technician Added: " + data.name);
    populateTechDropdown();
}

async function populateTechDropdown() {
    const select = document.getElementById("techSelect");
    const techs = await getTechs();
    select.innerHTML = '<option value="">Select Technician</option>';
    techs.forEach((t, i) => select.innerHTML += `<option value="${i}" data-name="${t.name}" data-phone="${t.phone}">${t.name}</option>`);
}

// ---------- LOGIN ----------
function toggleLoginFields() {
    const selectedRole = document.getElementById("roleSelect").value;
    document.getElementById("adminPassword").classList.toggle("hidden", selectedRole !== "Admin");
    document.getElementById("techLogin").classList.toggle("hidden", selectedRole !== "Tech");
}

function login() {
    role = document.getElementById("roleSelect").value;
    if (role === "Admin") {
        const pass = document.getElementById("adminPassword").value;
        if (pass !== "1234") return alert("Incorrect Password");
        document.getElementById("adminPanel").classList.remove("hidden");
    }

    if (role === "Tech") {
        const sel = document.getElementById("techSelect");
        const index = sel.value;
        if (index === "") return alert("Select Technician");
        loggedTech = { name: sel.options[index].dataset.name, phone: sel.options[index].dataset.phone };
    }

    document.getElementById("loginCard").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("userDisplay").innerText = role === "Tech" ? `${loggedTech.name} (${loggedTech.phone})` : role;
}

function logout() {
    currentMachine = "";
    location.reload();
}

// ---------- MACHINES ----------
async function createMachine() {
    const machine_id = document.getElementById("newMachineId").value.trim();
    if (!machine_id) return alert("Machine ID required");

    const data = {
        machine_id,
        airport: document.getElementById("airport").value,
        terminal: document.getElementById("terminal").value,
        checkpoint: document.getElementById("checkpoint").value,
        lane: document.getElementById("lane").value,
        notes: document.getElementById("notes").value
    };

    const res = await fetch(API + "/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    if (result.error) return alert(result.error);
    alert("Machine Created: " + result.machine_id);
}

async function loadMachine() {
    const id = document.getElementById("machineId").value.trim();
    if (!id) return alert("Enter a Machine ID");

    const res = await fetch(API + "/machines/" + id);
    if (res.status !== 200) return alert("Machine not found");

    currentMachine = id;
    document.getElementById("machineSection").classList.remove("hidden");
    displayHistory();
    loadLocation();
}

// ---------- SERVICE ----------
async function getLogs() {
    if (!currentMachine) return [];
    const res = await fetch(API + "/logs/" + currentMachine);
    return await res.json();
}

async function addService() {
    if (role === "Supervisor") return alert("Supervisors cannot log service");
    if (!currentMachine) return alert("Load a machine first");

    const parts = [
        document.getElementById("part1").value,
        document.getElementById("part2").value,
        document.getElementById("part3").value,
        document.getElementById("part4").value,
        document.getElementById("part5").value
    ].filter(p => p.trim() !== "");

    const data = {
        machine_id: currentMachine,
        tech_name: loggedTech?.name || "N/A",
        tech_phone: loggedTech?.phone || "N/A",
        work_order: document.getElementById("workOrder").value || "N/A",
        details: document.getElementById("details").value,
        parts: parts.join(", "),
        downtime: document.getElementById("downtime").value || 0
    };

    const res = await fetch(API + "/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    alert("Service log submitted!");

    document.getElementById("workOrder").value = "";
    document.getElementById("details").value = "";
    for (let i = 1; i <= 5; i++) document.getElementById(`part${i}`).value = "";
    document.getElementById("downtime").value = "";

    displayHistory();
}

async function displayHistory() {
    const history = document.getElementById("history");
    history.innerHTML = "";
    const logs = await getLogs();
    logs.reverse().forEach(log => {
        const partsHTML = log.parts ? `<br>Parts: ${log.parts}` : "";
        const workOrderHTML = log.work_order ? `<br>Work Order #: ${log.work_order}` : "";
        history.innerHTML += `
        <div class="log">
            <strong>${new Date(log.date).toLocaleString()}</strong>
            ${workOrderHTML}<br>
            Tech: ${log.tech_name}<br>
            Phone: ${log.tech_phone}<br>
            Downtime: ${log.downtime} hrs<br>
            Work: ${log.details}${partsHTML}
        </div>`;
    });
}

// ---------- LOCATION ----------
async function loadLocation() {
    const res = await fetch(API + "/machines/" + currentMachine);
    const data = await res.json();
    const display = document.getElementById("locationDisplay");
    if (!data) return display.innerHTML = "No location set.";
    display.innerHTML = `Airport: ${data.airport}<br>Terminal: ${data.terminal}<br>Checkpoint: ${data.checkpoint}<br>Lane: ${data.lane}<br>Notes: ${data.notes}`;
}

async function updateLocation() {
    const oldDataRes = await fetch(API + "/machines/" + currentMachine);
    const oldData = await oldDataRes.json();

    const newData = {
        airport: document.getElementById("updateAirport").value,
        terminal: document.getElementById("updateTerminal").value,
        checkpoint: document.getElementById("updateCheckpoint").value,
        lane: document.getElementById("updateLane").value,
        notes: document.getElementById("updateNotes").value
    };

    await fetch(API + "/machines/" + currentMachine + "/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData)
    });

    const details = `Machine moved from Airport: ${oldData.airport}, Terminal: ${oldData.terminal}, Checkpoint: ${oldData.checkpoint}, Lane: ${oldData.lane}, Notes: ${oldData.notes} To Airport: ${newData.airport}, Terminal: ${newData.terminal}, Checkpoint: ${newData.checkpoint}, Lane: ${newData.lane}, Notes: ${newData.notes}`;
    
    await fetch(API + "/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            machine_id: currentMachine,
            tech_name: loggedTech?.name || "N/A",
            tech_phone: loggedTech?.phone || "N/A",
            details,
            parts: "",
            downtime: 0,
            work_order: "Location Update"
        })
    });

    alert("Location updated and logged in history");
    loadLocation();
    displayHistory();
}

// ---------- TABS ----------
function showTab(tabId, btn) {
    document.getElementById("historyTab").classList.add("hidden");
    document.getElementById("logTab").classList.add("hidden");
    document.getElementById("locationTab").classList.add("hidden");
    document.getElementById(tabId).classList.remove("hidden");
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

// ---------- QR ----------
function startScanner() {
    const reader = document.getElementById("reader");
    reader.classList.remove("hidden");
    scanner = new Html5Qrcode("reader");
    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        qr => {
            document.getElementById("machineId").value = qr;
            scanner.stop();
            reader.classList.add("hidden");
        }
    );
}

// ---------- INIT ----------
populateTechDropdown();
