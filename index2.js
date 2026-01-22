// index2.js
import "dotenv/config";
import { ApifyClient } from "apify-client";
import axios from "axios";

/* ================= APIFY CLIENT ================= */
const client = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

/* ================= HELPERS ================= */
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

const getReelViews = post =>
  Number(post.videoViewCount) ||
  Number(post.playCount) ||
  Number(post.viewCount) ||
  0;

const getPostDate = post => {
  if (post.timestamp) return new Date(post.timestamp);
  if (post.takenAtTimestamp) return new Date(post.takenAtTimestamp * 1000);
  return null;
};

/* ================= ACCOUNT TIER ================= */
function getAccountTier(followers) {
  if (followers < 10_000) return "Small Creator";
  if (followers < 100_000) return "Growing Creator";
  if (followers < 1_000_000) return "Large Account";
  return "Celebrity / Brand";
}

function getWeightsByTier(tier) {
  switch (tier) {
    case "Small Creator": return { engagement: 0.5, growth: 0.3, consistency: 0.2 };
    case "Growing Creator": return { engagement: 0.4, growth: 0.35, consistency: 0.25 };
    case "Large Account": return { engagement: 0.3, growth: 0.3, consistency: 0.4 };
    case "Celebrity / Brand": return { engagement: 0.2, growth: 0.25, consistency: 0.55 };
    default: return { engagement: 0.4, growth: 0.3, consistency: 0.3 };
  }
}

function getConsistencyFloor(tier) {
  switch (tier) {
    case "Small Creator": return 0;
    case "Growing Creator": return 20;
    case "Large Account": return 35;
    case "Celebrity / Brand": return 50;
    default: return 0;
  }
}

/* ===================================================
   🚀 MAIN SERVICE EXPORT (FULL FEATURED)
   =================================================== */
export async function scrapeInstagram(username) {
  if (!username) throw new Error("Username required");

  /* ---------- PROFILE ---------- */
  const profileRun = await client
    .actor("apify/instagram-profile-scraper")
    .call({ usernames: [username] });

  const profileItems = await client
    .dataset(profileRun.defaultDatasetId)
    .listItems();

  const profile = profileItems.items[0] || {};
  const followers = Number(profile.followersCount) || 0;

  /* ---------- POSTS ---------- */
  const postRun = await client.actor("apify/instagram-scraper").call({
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsLimit: 30,
    scrapePosts: true,
    scrapeComments: true,
  });

  const { items } = await client
    .dataset(postRun.defaultDatasetId)
    .listItems();

  if (!items.length) throw new Error("No posts fetched");

  const reels = items.filter(p => getReelViews(p) > 0);
  const imagePosts = items.filter(p => getReelViews(p) === 0);

  /* ---------- METRICS ---------- */
  const imageLikes = imagePosts.map(p => Number(p.likesCount) || 0);
  const imageComments = imagePosts.map(p => Number(p.commentsCount) || 0);

  const reelLikes = reels.map(p => Number(p.likesCount) || 0);
  const reelComments = reels.map(p => Number(p.commentsCount) || 0);
  const reelViews = reels.map(getReelViews);

  const avgLikesAll = avg([...imageLikes, ...reelLikes]);
  const avgCommentsAll = avg([...imageComments, ...reelComments]);

  /* ---------- TOP 3 REELS ---------- */
  let top1 = null, top2 = null, top3 = null;

  for (const post of reels.slice(0, 20)) {
    const views = getReelViews(post);
    if (!views) continue;

    const date = getPostDate(post);

    const reelData = {
      views,
      caption: post.caption || "",
      hashtags: post.caption?.match(/#[a-zA-Z0-9_]+/g) || [],
      timestamp: date ? date.toISOString() : null,
      daysAgo: date
        ? Math.floor((Date.now() - date.getTime()) / 86400000)
        : null,
    };

    if (!top1 || views > top1.views) {
      top3 = top2;
      top2 = top1;
      top1 = reelData;
    } else if (!top2 || views > top2.views) {
      top3 = top2;
      top2 = reelData;
    } else if (!top3 || views > top3.views) {
      top3 = reelData;
    }
  }

  const topViewedPosts = [top1, top2, top3].filter(Boolean);

  /* ---------- COMMENTS ---------- */
  const commentsText = [];
  for (const post of items) {
    for (const c of post.latestComments || []) {
      if (c?.text) commentsText.push(c.text.trim());
      if (commentsText.length >= 100) break;
    }
    if (commentsText.length >= 100) break;
  }

  /* ---------- SENTIMENT (PYTHON SERVER) ---------- */
  let sentiment = null;
  try {
    const sentimentRes = await axios.post(
      "http://127.0.0.1:8000/analyze-summary",
      { comments: commentsText }
    );
    sentiment = sentimentRes.data;
  } catch (error) {
    console.error("❌ Sentiment Analysis Failed:");
    if (error.response) {
      // Server responded with a status code outside 2xx range
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error("   No response received. Is the Python server running?");
    } else {
      // Something happened in setting up the request
      console.error("   Error:", error.message);
    }
    sentiment = { error: "Sentiment service unavailable" };
  }

  /* ---------- HEALTH ---------- */
  const tier = getAccountTier(followers);
  const weights = getWeightsByTier(tier);
  const consistencyFloor = getConsistencyFloor(tier);

  const engagementRate =
    followers > 0 ? ((avgLikesAll + avgCommentsAll) / followers) * 100 : 0;

  const engagementScore =
    tier === "Celebrity / Brand"
      ? clamp((engagementRate / 1) * 100, 0, 100)
      : clamp(engagementRate * 10, 0, 100);

  const mid = Math.floor(items.length / 2);
  const recentAvg = avg(items.slice(0, mid).map(p => p.likesCount || 0));
  const olderAvg = avg(items.slice(mid).map(p => p.likesCount || 0)) || 1;

  const growthScore = clamp(((recentAvg / olderAvg) - 1) * 100 + 50, 0, 100);

  const meanLikes = avg(items.map(p => Number(p.likesCount) || 0));
  const variance = avg(items.map(p => Math.abs((p.likesCount || 0) - meanLikes)));

  const rawConsistency = 100 - (variance / (meanLikes || 1)) * 100;
  const consistencyScore = clamp(Math.max(rawConsistency, consistencyFloor), 0, 100);

  const healthScore = Math.round(
    weights.engagement * engagementScore +
    weights.growth * growthScore +
    weights.consistency * consistencyScore
  );

  /* ---------- FINAL RETURN (FULL MATCH) ---------- */
  return {
    username,
    followers,
    accountTier: tier,

    imagePosts: {
      count: imagePosts.length,
      averageLikes: Math.round(avg(imageLikes)),
      averageComments: Math.round(avg(imageComments)),
    },

    reels: {
      count: reels.length,
      averageLikes: Math.round(avg(reelLikes)),
      averageComments: Math.round(avg(reelComments)),
      averageViews: Math.round(avg(reelViews)),
    },

    topViewedPosts,
    commentsText,
    sentiment,

    profileHealth: {
      score: healthScore,
      engagementRate: Number(engagementRate.toFixed(2)),
      weights,
      components: {
        engagement: Math.round(engagementScore),
        growth: Math.round(growthScore),
        consistency: Math.round(consistencyScore),
      },
    },
  };
}
