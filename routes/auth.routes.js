import express from "express";
import pool from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  const result = await pool.query(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id },
    "SUPER_SECRET_KEY",
    { expiresIn: "1h" }
  );

  res.json({ token });
});

export default router;
