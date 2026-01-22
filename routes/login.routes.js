import express from "express";
const router = express.Router();

router.post("/login", (req, res) => {
  // Receive whatever frontend sends
  console.log("Login data received:", req.body);

  // No auth, no validation
  res.json({ success: true });
});

export default router;
