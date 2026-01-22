import express from "express";
import cors from "cors";
import "dotenv/config";
import { scrapeInstagram } from "./index2.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => res.send("🚀 Server running"));

app.post("/scrape-instagram", async (req, res) => {
  console.log("🔥 Route hit", req.body);

  try {
    const data = await scrapeInstagram(req.body.username);
    console.log("✅ Data ready, sending response");
    res.json(data);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(5000, () =>
  console.log("✅ Server running on http://localhost:5000")
);
