import express from "express";
import cors from "cors";
import "dotenv/config";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeInstagram } from "./index2.js";

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:8000";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "your", "have", "just",
  "into", "about", "their", "they", "them", "what", "when", "where", "would",
  "could", "should", "there", "here", "been", "than", "then", "over", "under",
  "after", "before", "more", "most", "very", "much", "really", "love", "like",
  "amazing", "great", "nice", "good", "awesome", "please", "price", "link",
  "comment", "comments", "video", "reel", "post", "posts", "instagram"
]);

function extractHashtags(posts = []) {
  const counts = new Map();

  for (const post of posts) {
    for (const tag of post.hashtags || []) {
      const cleanTag = tag.toLowerCase();
      counts.set(cleanTag, (counts.get(cleanTag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, count]) => ({
      tag,
      strength: count >= 3 ? "High" : count === 2 ? "Medium" : "Emerging",
    }));
}

function extractKeywords(texts = [], limit = 8) {
  const counts = new Map();

  for (const text of texts) {
    const words = String(text)
      .toLowerCase()
      .replace(/[^a-z0-9#\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !word.startsWith("#") && !STOPWORDS.has(word));

    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function classifyFocus(posts = []) {
  const captions = posts.map((post) => String(post.caption || "").toLowerCase()).join(" ");

  if (/(tutorial|steps|how to|tips|guide|learn)/.test(captions)) {
    return "Educational";
  }
  if (/(story|behind the scenes|day in the life|journey)/.test(captions)) {
    return "Behind the scenes";
  }
  if (/(trend|funny|relatable|challenge|viral)/.test(captions)) {
    return "Entertainment";
  }

  return "Brand storytelling";
}

function getSentimentLabel(sentiment = {}) {
  if (sentiment.positive >= 60) return "Very Positive";
  if (sentiment.positive >= 40) return "Positive";
  if (sentiment.curious >= 30) return "Curious";
  return "Mixed";
}

function buildSmartSchedule(profile) {
  const timestamps = (profile.topViewedPosts || [])
    .map((post) => post.timestamp ? new Date(post.timestamp) : null)
    .filter(Boolean);

  const hourBuckets = timestamps.length ? timestamps.map((date) => date.getHours()) : [19];
  const avgHour = Math.round(hourBuckets.reduce((sum, hour) => sum + hour, 0) / hourBuckets.length);
  const weekdayBuckets = timestamps.length
    ? timestamps.map((date) => date.toLocaleDateString("en-US", { weekday: "long" }))
    : ["Tuesday"];

  const weekdayCounts = weekdayBuckets.reduce((acc, day) => {
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const bestDay = Object.entries(weekdayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Tuesday";
  const confidence = Math.min(97, Math.max(62, Math.round((profile.profileHealth.score || 70) * 0.9)));
  const avgViews = profile.reels?.averageViews || 0;
  const projectedMin = Math.max(5000, Math.round(avgViews * 0.9));
  const projectedMax = Math.max(projectedMin + 3000, Math.round(avgViews * 1.15));
  const recommendation = `${bestDay} at ${String(avgHour).padStart(2, "0")}:00 tends to align with your strongest recent reel windows.`;

  return {
    bestDay,
    bestHour: `${String(avgHour).padStart(2, "0")}:00`,
    confidence,
    projectedReach: `${projectedMin.toLocaleString()} - ${projectedMax.toLocaleString()}`,
    recommendation,
    suggestions: [
      `Schedule your next high-value post on ${bestDay} around ${String(avgHour).padStart(2, "0")}:00.`,
      `Your top content is performing best when paired with ${classifyFocus(profile.topViewedPosts).toLowerCase()} angles.`,
      `Use the first 30 minutes after posting for replies to boost early engagement velocity.`,
    ],
  };
}

function buildCreativeEngine(profile, blueprint = null) {
  const topKeywords = extractKeywords(
    [...(profile.commentsText || []), ...((profile.topViewedPosts || []).map((post) => post.caption || ""))],
    6
  ).map((entry) => entry.word);

  const pillars = blueprint?.strategy?.content_pillars || ["Education", "Trust-building", "Community"];
  const hooks = [
    `Stop scrolling if ${topKeywords[0] || "growth"} has been confusing you.`,
    `The truth about ${topKeywords[1] || "engagement"} nobody explains clearly.`,
    `3 reasons your audience keeps asking about ${topKeywords[2] || "pricing"}.`,
  ];

  const ideas = [
    {
      label: "Carousel",
      angle: pillars[0] || "Education",
      title: `5 mistakes brands make with ${topKeywords[0] || "content strategy"}`,
      summary: "Use a myth-busting structure that ends with a practical CTA.",
      score: "High save potential",
    },
    {
      label: "Reel",
      angle: pillars[1] || "Trust-building",
      title: `A quick fix for ${topKeywords[1] || "low engagement"} in under 30 seconds`,
      summary: "Show one problem, one fix, and one example from your niche.",
      score: "High shareability",
    },
    {
      label: "Caption",
      angle: pillars[2] || "Community",
      title: `Tell the story behind your audience's biggest question`,
      summary: "Open with a strong POV, then invite replies with a specific question.",
      score: "Comment driver",
    },
  ];

  const boosts = [
    `Your audience repeatedly mentions ${topKeywords[0] || "clarity"}, so lead with a direct promise in your first line.`,
    `Repurpose your strongest reel into a carousel so you capture both shares and saves.`,
    `Use ${blueprint?.strategy?.cta || "a DM or comment CTA"} to turn curiosity into action.`,
  ];

  const brandContext = {
    niche: classifyFocus(profile.topViewedPosts),
    voice: [blueprint?.strategy?.tone || "Helpful", "Clear", "Action-oriented"],
    topTopic: topKeywords[0] || "engagement",
  };

  return {
    hooks,
    ideas,
    boosts,
    brandContext,
  };
}

function buildCollaborators(profile, competitive = null) {
  const niche = classifyFocus(profile.topViewedPosts);
  const usernames = competitive?.overview?.map((item) => item.username) || ["creatorloop", "growthgrid", "brandforge"];

  return usernames.slice(0, 3).map((username, index) => ({
    username,
    fitScore: 88 - index * 7,
    category: index === 0 ? "Safe fit" : index === 1 ? "Reach expansion" : "Community play",
    reason: index === 0
      ? `Audience overlap around ${niche.toLowerCase()} content and similar engagement patterns.`
      : index === 1
        ? `Strong adjacent audience that already reacts to themes like ${extractKeywords(profile.commentsText || [], 2)[0]?.word || "education"}.`
        : "Good fit for co-created posts, live sessions, or educational swaps.",
    format: index === 0 ? "Educational co-post" : index === 1 ? "Reel collab" : "Live session",
    outreach: `Hey @${username}, I love how you approach ${niche.toLowerCase()} content. I think our audiences would both get value from a quick ${index === 2 ? "live session" : "collab post"} around a practical tip series. Open to exploring it?`,
  }));
}

function buildCompetitiveInsights(brand, competitors) {
  const brandEngagement = brand?.profileHealth?.engagementRate || 0;
  const brandGrowth = brand?.profileHealth?.components?.growth || 0;
  const brandReelViews = brand?.reels?.averageViews || 0;

  const overview = competitors.map((profile) => {
    const engagementDelta = (profile.profileHealth.engagementRate || 0) - brandEngagement;
    const growthDelta = (profile.profileHealth.components?.growth || 0) - brandGrowth;

    return {
      username: profile.username,
      score: profile.profileHealth.score,
      accountTier: profile.accountTier,
      engagementRate: profile.profileHealth.engagementRate,
      growthScore: profile.profileHealth.components?.growth || 0,
      sentimentLabel: getSentimentLabel(profile.sentiment),
      focus: classifyFocus(profile.topViewedPosts),
      comparison: engagementDelta > 0
        ? `+${engagementDelta.toFixed(2)}% engagement vs you`
        : `${engagementDelta.toFixed(2)}% engagement vs you`,
      trend: growthDelta > 5 ? "Accelerating" : growthDelta < -5 ? "Cooling off" : "Steady",
    };
  });

  const breakdown = competitors.map((profile) => ({
    username: profile.username,
    focus: classifyFocus(profile.topViewedPosts),
    sentiment: getSentimentLabel(profile.sentiment),
    themes: extractKeywords(
      [
        ...(profile.commentsText || []).slice(0, 30),
        ...((profile.topViewedPosts || []).map((post) => post.caption || "")),
      ],
      3
    ).map((entry) => entry.word),
  }));

  const topPosts = competitors.flatMap((profile) =>
    (profile.topViewedPosts || []).map((post) => ({
      username: profile.username,
      views: post.views || 0,
      caption: post.caption || "No caption available",
      badge: post.views > brandReelViews ? "Outperforming" : "Watchlist",
    }))
  )
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const gaps = [];

  const betterEngagement = competitors
    .filter((profile) => (profile.profileHealth.engagementRate || 0) > brandEngagement)
    .sort((a, b) => (b.profileHealth.engagementRate || 0) - (a.profileHealth.engagementRate || 0));

  if (betterEngagement[0]) {
    gaps.push(
      `${betterEngagement[0].username} is beating you on engagement by ${(
        betterEngagement[0].profileHealth.engagementRate - brandEngagement
      ).toFixed(2)}%.`
    );
  }

  const betterViews = competitors
    .filter((profile) => (profile.reels?.averageViews || 0) > brandReelViews)
    .sort((a, b) => (b.reels?.averageViews || 0) - (a.reels?.averageViews || 0));

  if (betterViews[0]) {
    gaps.push(
      `${betterViews[0].username} is getting stronger reel reach with ${betterViews[0].reels.averageViews.toLocaleString()} average views.`
    );
  }

  const frequentThemes = extractKeywords(
    competitors.flatMap((profile) => [
      ...(profile.commentsText || []).slice(0, 25),
      ...((profile.topViewedPosts || []).map((post) => post.caption || "")),
    ]),
    5
  ).map((entry) => entry.word);

  if (frequentThemes.length) {
    gaps.push(`Competitor audiences keep reacting to themes like ${frequentThemes.join(", ")}.`);
  }

  return {
    brand: {
      username: brand.username,
      score: brand.profileHealth.score,
      engagementRate: brandEngagement,
      growthScore: brandGrowth,
    },
    overview,
    breakdown,
    topPosts,
    gaps,
  };
}

async function buildGrowthBlueprint(profile) {
  let strategyData = null;

  try {
    const response = await axios.post(`${PYTHON_API_URL}/growth-strategy`, {
      comments: profile.commentsText || [],
    });
    strategyData = response.data;
  } catch (error) {
    console.error("❌ Growth blueprint call failed");
    console.error(error.message);
  }

  const captionTexts = (profile.topViewedPosts || []).map((post) => post.caption || "");
  const keywords = extractKeywords([...(profile.commentsText || []), ...captionTexts], 10)
    .map((entry) => entry.word);

  const hashtags = extractHashtags(profile.topViewedPosts || []);
  const topics = extractKeywords(profile.commentsText || [], 5).map((entry) => ({
    topic: entry.word,
    momentum: Math.min(95, 40 + entry.count * 12),
  }));

  const fallbackIdeas = [
    `Create a reel explaining why followers ask about ${keywords[0] || "your offer"}.`,
    `Turn your top comment questions into a carousel FAQ.`,
    `Post a behind-the-scenes story that reinforces ${keywords[1] || "trust"}.`,
  ];

  return {
    username: profile.username,
    keywords,
    hashtags,
    insights: strategyData?.insights_detected || [],
    strategy: strategyData?.strategy || {
      content_pillars: ["Education", "Trust-building", "Social proof"],
      posting_frequency: "3 posts/week",
      primary_goal: "Increase engagement",
      tone: "Helpful and confident",
      cta: "Ask followers to DM or comment with their biggest blocker",
    },
    metrics: strategyData?.metrics || {},
    topics,
    contentIdeas: strategyData?.content_ideas || fallbackIdeas.join("\n\n"),
  };
}

console.log("🟢 Initializing Express server...");

app.use(cors());
console.log("✅ CORS enabled");

app.use(express.json());
console.log("✅ JSON body parser enabled");

app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (_, res) => {
  console.log("📡 Landing page hit (/)");
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "scaleup-node" });
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
    console.log("📊 Scraped data preview:");
    console.log(data);

    console.log("📤 Sending response to client");
    res.json(data);

    console.log("================ END REQUEST =================\n");
  } catch (err) {
    console.error("❌ Error occurred during scraping");
    console.error(err);

    res.status(500).json({ error: err.message });
  }
});

app.post("/competitive-insights", async (req, res) => {
  try {
    const { username, competitors = [], baseProfile } = req.body;
    const cleanCompetitors = competitors
      .map((name) => String(name || "").replace(/^@/, "").trim())
      .filter(Boolean)
      .slice(0, 5);

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    if (!cleanCompetitors.length) {
      return res.status(400).json({ error: "At least one competitor is required" });
    }

    const brandProfile = baseProfile || await scrapeInstagram(username);
    const competitorProfiles = await Promise.all(
      cleanCompetitors.map((competitor) => scrapeInstagram(competitor))
    );

    res.json(buildCompetitiveInsights(brandProfile, competitorProfiles));
  } catch (err) {
    console.error("❌ Competitive insights failed");
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate competitive insights" });
  }
});

app.post("/growth-blueprint", async (req, res) => {
  try {
    const { username, profileData } = req.body;

    if (!username && !profileData) {
      return res.status(400).json({ error: "Username or profileData required" });
    }

    const profile = profileData || await scrapeInstagram(username);
    const blueprint = await buildGrowthBlueprint(profile);

    res.json(blueprint);
  } catch (err) {
    console.error("❌ Growth blueprint failed");
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate growth blueprint" });
  }
});

app.post("/smart-scheduling", async (req, res) => {
  try {
    const { username, profileData } = req.body;

    if (!username && !profileData) {
      return res.status(400).json({ error: "Username or profileData required" });
    }

    const profile = profileData || await scrapeInstagram(username);
    res.json(buildSmartSchedule(profile));
  } catch (err) {
    console.error("❌ Smart scheduling failed");
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate smart scheduling data" });
  }
});

app.post("/ai-creative-engine", async (req, res) => {
  try {
    const { username, profileData, blueprintData } = req.body;

    if (!username && !profileData) {
      return res.status(400).json({ error: "Username or profileData required" });
    }

    const profile = profileData || await scrapeInstagram(username);
    res.json(buildCreativeEngine(profile, blueprintData));
  } catch (err) {
    console.error("❌ AI creative engine failed");
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate creative ideas" });
  }
});

app.post("/creator-match", async (req, res) => {
  try {
    const { username, profileData, competitiveData } = req.body;

    if (!username && !profileData) {
      return res.status(400).json({ error: "Username or profileData required" });
    }

    const profile = profileData || await scrapeInstagram(username);
    res.json({ matches: buildCollaborators(profile, competitiveData) });
  } catch (err) {
    console.error("❌ Creator match failed");
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate creator matches" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server boot successful");
  console.log(`🌐 Listening on http://localhost:${PORT}`);
});
