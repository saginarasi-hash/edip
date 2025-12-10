import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🧾 Register API (with duplicate check)
app.post("/api/register", async (req, res) => {
  const { name, email, phone, address, gender, age } = req.body;

  // Stop registrations after 23rd of the month
  const today = new Date();
  if (today.getDate() > 23) {
    return res.json({ message: "Registrations are closed for this month!" });
  }

  try {
    // 🔍 Check if user already registered this month
    const [existing] = await pool.query(
      `SELECT * FROM registrations 
       WHERE (email = ? OR phone = ?)
       AND MONTH(registered_at) = MONTH(CURRENT_DATE())
       AND YEAR(registered_at) = YEAR(CURRENT_DATE())`,
      [email, phone]
    );

    if (existing.length > 0) {
      return res.json({
        message:
          "Registration already exists with this phone number or email!",
      });
    }

    // ✅ New registration
    await pool.query(
      "INSERT INTO registrations (name, email, phone, address, gender, age) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, phone, address, gender, age]
    );
    res.json({ message: "Registered successfully!" });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Database error!" });
  }
});

// 🧭 Public API to show winners
app.get("/api/winners", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM winners ORDER BY selected_at DESC LIMIT 10"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching winners:", err);
    res.status(500).json({ message: "Database error!" });
  }
});
// 🔍 Check duplicate phone or email (for real-time validation)
app.post("/api/check-duplicate", async (req, res) => {
  const { email, phone } = req.body;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM registrations 
       WHERE (email = ? OR phone = ?)
       AND MONTH(registered_at) = MONTH(CURRENT_DATE())
       AND YEAR(registered_at) = YEAR(CURRENT_DATE())`,
      [email, phone]
    );

    if (rows.length > 0) {
      return res.json({ exists: true });
    }
    res.json({ exists: false });
  } catch (err) {
    console.error("❌ Error checking duplicate:", err);
    res.status(500).json({ message: "Database error!" });
  }
});


// 🎲 Lucky Dip selection (admin or auto trigger)
app.post("/api/luckydip", async (req, res) => {
  try {
    // Select 2 random winners from current month
    const [users] = await pool.query(`
      SELECT * FROM registrations
      WHERE MONTH(registered_at) = MONTH(CURRENT_DATE())
      AND YEAR(registered_at) = YEAR(CURRENT_DATE())
      ORDER BY RAND() LIMIT 2
    `);

    if (users.length === 0)
      return res.json({ message: "No registrations yet!" });

    for (const u of users) {
      await pool.query(
        "INSERT INTO winners (reg_id, name, email) VALUES (?, ?, ?)",
        [u.id, u.name, u.email]
      );
    }

    res.json({ message: "🎉 Lucky dip completed!", winners: users });
  } catch (err) {
    console.error("❌ Error selecting winners:", err);
    res.status(500).json({ message: "Error selecting winners!" });
  }
});

// 🌐 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
