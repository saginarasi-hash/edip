import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,       // ✅ correct
  user: process.env.DB_USER,       // ✅ correct
  password: process.env.DB_PASS,   // ✅ correct
  database: process.env.DB_NAME,   // ✅ correct
  port: Number(process.env.DB_PORT), // ✅ ensure it's a number
  waitForConnections: true,
  ssl: { rejectUnauthorized: false } ,
  connectionLimit: 10,
  queueLimit: 0,
});

try {
  const connection = await pool.getConnection();
  console.log("✅ Database connected successfully!");
  connection.release();
} catch (err) {
  console.error("❌ Database connection failed:", err.message);
}
