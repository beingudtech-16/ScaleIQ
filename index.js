import express from "express";
import cors from "cors";
import "dotenv/config";
import { scrapeInstagram } from "./index2.js";
import { db } from "./firebase.js";

const app = express();

console.log("🟢 Initializing Express server...");

app.use(cors());
console.log("✅ CORS enabled");

app.use(express.json());
console.log("✅ JSON body parser enabled");

app.get("/", (_, res) => {
  console.log("📡 Health check hit (/)");
  res.send("🚀 Server running");
});

app.post("/scrape-instagram", async (req, res) => {
  console.log("\n================ SCRAPE INSTAGRAM =================");
  console.log("🔥 Route /scrape-instagram hit");

  console.log("📥 Request body received:");
  console.log(req.body);

  try {
    console.log("🔍 Starting Instagram scrape for username:");
    console.log(req.body.username);

    const data = await scrapeInstagram(req.body.username);

    console.log("✅ Scraping completed successfully");
    res.json(data);

    console.log("================ END REQUEST =================\n");
  } catch (err) {
    console.error("❌ Error occurred during scraping");
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/dashboard", async (req, res) => {
  console.log("\n================ API DASHBOARD (SCRAPE + SAVE) =================");
  const { username, userId } = req.body; // Added optional userId

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    console.log(`🔍 Scraping data for: ${username}`);
    const data = await scrapeInstagram(username);

    console.log(`💾 Saving scrape to Firestore for: ${username}`);
    // Save to a collection named 'scrapes'
    await db.collection("scrapes").add({
      username: username,
      userId: userId || "anonymous",
      timestamp: new Date(),
      data: data
    });

    console.log("✅ Data saved and returning to client");
    res.json(data);

  } catch (err) {
    console.error("❌ Error in /api/dashboard:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/save-profile", async (req, res) => {
  console.log("\n================ SAVE PROFILE =================");
  const { userId, instagram, category, description } = req.body;

  if (!userId || !instagram) {
    return res.status(400).json({ error: "UserID and Instagram handle are required" });
  }

  try {
    console.log(`💾 Saving profile for UserID: ${userId}`);

    await db.collection("users").doc(userId).set({
      instagram,
      category,
      description,
      updatedAt: new Date()
    }, { merge: true });

    console.log("✅ Profile saved successfully");
    res.json({ success: true, message: "Profile saved" });

  } catch (err) {
    console.error("❌ Error in /api/save-profile:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log("🚀 Server boot successful");
  console.log("🌐 Listening on http://localhost:5000");
});
