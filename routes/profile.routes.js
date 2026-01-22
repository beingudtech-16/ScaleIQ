import express from "express";
const router = express.Router();

// TEMP in-memory store (later replace with DB)
let profileData = {};

router.post("/profile", (req, res) => {
  const { instagram, category, description } = req.body;

  profileData = { instagram, category, description };
  console.log("Saved profile:", profileData);

  res.json({ success: true });
});

router.get("/profile", (req, res) => {
  res.json(profileData);
});

export default router;
