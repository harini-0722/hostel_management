// backend/server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import db from "./db.js";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve static files (frontend)
app.use(express.static(path.join(__dirname, "../public")));

// ✅ Root route — always show login.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

// ✅ Debug environment (to check DB vars)
console.log("🌍 DB ENV:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
});

// 🔹 LOGIN API
app.post("/login", (req, res) => {
  const { username, password, role } = req.body;
  console.log("🔹 Login attempt:", username, role);

  const query = "SELECT * FROM users WHERE username = ? AND role = ?";
  db.query(query, [username, role], async (err, results) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ message: "Database connection failed" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid password" });
    }

    console.log(`✅ ${role} logged in successfully`);
    res.json({ redirect: role === "admin" ? "admin.html" : "student.html" });
  });
});
// API: Add new student
app.post("/add-student", (req, res) => {
  const {
    name,
    course,
    year,
    email,
    phone,
    joined,
    feeStatus,
    theme,
    hostelType,
    roomId,
    floor,
    block,
  } = req.body;

  const sql = `INSERT INTO students 
    (name, course, year, email, phone, joined, feeStatus, theme, hostelType, roomId, floor, block) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [name, course, year, email, phone, joined, feeStatus, theme, hostelType, roomId, floor, block],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Student added successfully!", id: result.insertId });
    }
  );
});

// API: Get all students
app.get("/students", (req, res) => {
  db.query("SELECT * FROM students", (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// ✅ Helper — Get local IP for testing
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
};

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log("🚀 Server running successfully!");
  console.log(`➡️  Local:   http://localhost:${PORT}`);
  console.log(`➡️  Network: http://${ip}:${PORT}`);
});
