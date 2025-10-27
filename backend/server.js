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

// 🔹 ADD STUDENT API
app.post("/add-student", (req, res) => {
  const { name, roll_no, course, year, email, room_no } = req.body;

  if (!name || !roll_no || !course || !year || !email || !room_no) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const query = `
    INSERT INTO students (name, roll_no, course, year, email, room_no)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [name, roll_no, course, year, email, room_no], (err) => {
    if (err) {
      console.error("❌ Error inserting student:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(200).json({ message: "✅ Student added successfully!" });
  });
});

// 🔹 GET STUDENT COUNTS
app.get("/student-counts", (req, res) => {
  const query = `
    SELECT 
      CASE 
        WHEN room_no LIKE 'W%' THEN 'Women'
        WHEN room_no LIKE 'M%' THEN 'Men'
        ELSE 'Unknown'
      END AS hostel,
      COUNT(*) AS count
    FROM students
    GROUP BY hostel;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error fetching student counts:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const data = { Women: 0, Men: 0 };
    results.forEach((r) => {
      if (r.hostel === "Women") data.Women = r.count;
      else if (r.hostel === "Men") data.Men = r.count;
    });

    res.json(data);
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
