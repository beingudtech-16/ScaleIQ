// index2.js
import "dotenv/config";
import { ApifyClient } from "apify-client";
import axios from "axios";

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:8000";

/* =================  CONFIG — all magic numbers live here  ================= */
const CONFIG = {
  scrape: {
    postsLimit:     30,   // how many posts to fetch from Apify
    reelsToScan:    20,   // how many reels to consider for top-N ranking
    commentsLimit:  100,  // max comments to collect for sentiment
    topReelsCount:  3,    // how many top reels to return
  },

  tiers: {
    smallCreator:   { maxFollowers: 10_000,    label: "Small Creator" },
    growingCreator: { maxFollowers: 100_000,   label: "Growing Creator" },
    largeAccount:   { maxFollowers: 1_000_000, label: "Large Account" },
    celebrity:      {                          label: "Celebrity / Brand" },
  },

  weights: {
    "Small Creator":     { engagement: 0.5,  growth: 0.30, consistency: 0.20 },
    "Growing Creator":   { engagement: 0.4,  growth: 0.35, consistency: 0.25 },
    "Large Account":     { engagement: 0.3,  growth: 0.30, consistency: 0.40 },
    "Celebrity / Brand": { engagement: 0.2,  growth: 0.25, consistency: 0.55 },
  },

  consistencyFloor: {
    "Small Creator":     0,
    "Growing Creator":   20,
    "Large Account":     35,
    "Celebrity / Brand": 50,
  },

  defaultWeights: { engagement: 0.4, growth: 0.3, consistency: 0.3 },

  engagement: {
    celebrityDivisor:   1,   // Celebrity rate is already low; divisor keeps score meaningful
    standardMultiplier: 10,  // Non-celebrity: multiply % rate to get 0-100 score
  },

  growth: {
    baselineOffset: 50,  // centres growthScore: 0 growth = 50, positive = above, negative = below
  },

  scoreRange: {
    min: 0,
    max: 100,
  },

  scheduling: {
    fallbackHour:                  19,
    fallbackDay:                   "Tuesday",
    confidenceMin:                 62,
    confidenceMax:                 97,
    confidenceScoreFactor:         0.9,
    projectedReachMinFloor:        5000,
    projectedReachLowMultiplier:   0.9,
    projectedReachHighMultiplier:  1.15,
    projectedReachMinGap:          3000,
  },
};

/* ================= APIFY CLIENT ================= */
const client = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

/* ================= HELPERS ================= */
const avg   = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

const getReelViews = post =>
  Number(post.videoViewCount) ||
  Number(post.playCount)      ||
  Number(post.viewCount)      ||
  0;

const getPostDate = post => {
  if (post.timestamp)        return new Date(post.timestamp);
  if (post.takenAtTimestamp) return new Date(post.takenAtTimestamp * 1000);
  return null;
};

/* ================= ACCOUNT TIER ================= */
function getAccountTier(followers) {
  const { smallCreator, growingCreator, largeAccount, celebrity } = CONFIG.tiers;
  if (followers < smallCreator.maxFollowers)   return smallCreator.label;
  if (followers < growingCreator.maxFollowers) return growingCreator.label;
  if (followers < largeAccount.maxFollowers)   return largeAccount.label;
  return celebrity.label;
}

function getWeightsByTier(tier) {
  return CONFIG.weights[tier] || CONFIG.defaultWeights;
}

function getConsistencyFloor(tier) {
  return CONFIG.consistencyFloor[tier] ?? 0;
}

/* ===================================================
   MAIN SERVICE EXPORT
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

  if (!profile || !profile.username) {
    throw new Error("Account not found. Please check the username and try again.");
  }

  if (profile.private === true || profile.isPrivate === true) {
    throw new Error("This account is private. ScaleIQ can only analyse public accounts.");
  }

  const followers = Number(profile.followersCount) || 0;

  /* ---------- POSTS ---------- */
  const postRun = await client.actor("apify/instagram-scraper").call({
    directUrls:     [`https://www.instagram.com/${username}/`],
    resultsLimit:   CONFIG.scrape.postsLimit,
    scrapePosts:    true,
    scrapeComments: true,
  });

  const { items } = await client
    .dataset(postRun.defaultDatasetId)
    .listItems();

  if (!items.length) throw new Error("No posts fetched. The account may have no public posts.");

  const reels      = items.filter(p => getReelViews(p) > 0);
  const imagePosts = items.filter(p => getReelViews(p) === 0);

  /* ---------- METRICS ---------- */
  const imageLikes    = imagePosts.map(p => Number(p.likesCount) || 0);
  const imageComments = imagePosts.map(p => Number(p.commentsCount) || 0);
  const reelLikes     = reels.map(p => Number(p.likesCount) || 0);
  const reelComments  = reels.map(p => Number(p.commentsCount) || 0);
  const reelViews     = reels.map(getReelViews);

  const avgLikesAll    = avg([...imageLikes, ...reelLikes]);
  const avgCommentsAll = avg([...imageComments, ...reelComments]);

  /* ---------- TOP REELS ---------- */
  const topViewedPosts = reels
    .slice(0, CONFIG.scrape.reelsToScan)
    .filter(p => getReelViews(p) > 0)
    .map(post => {
      const date = getPostDate(post);
      return {
        views:     getReelViews(post),
        caption:   post.caption || "",
        hashtags:  post.caption?.match(/#[a-zA-Z0-9_]+/g) || [],
        timestamp: date ? date.toISOString() : null,
        daysAgo:   date ? Math.floor((Date.now() - date.getTime()) / 86400000) : null,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, CONFIG.scrape.topReelsCount);

  /* ---------- COMMENTS ---------- */
  const commentsText = [];
  for (const post of items) {
    for (const c of post.latestComments || []) {
      if (c?.text) commentsText.push(c.text.trim());
      if (commentsText.length >= CONFIG.scrape.commentsLimit) break;
    }
    if (commentsText.length >= CONFIG.scrape.commentsLimit) break;
  }

  /* ---------- SENTIMENT ---------- */
  let sentiment = null;
  try {
    const sentimentRes = await axios.post(
      `${PYTHON_API_URL}/analyze-summary`,
      { comments: commentsText }
    );
    sentiment = sentimentRes.data;
  } catch (error) {
    console.error("❌ Sentiment Analysis Failed:");
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:",   error.response.data);
    } else if (error.request) {
      console.error("   No response received. Is the Python server running?");
    } else {
      console.error("   Error:", error.message);
    }
    sentiment = { error: "Sentiment service unavailable" };
  }

  /* ---------- HEALTH SCORE ---------- */
  const tier             = getAccountTier(followers);
  const weights          = getWeightsByTier(tier);
  const consistencyFloor = getConsistencyFloor(tier);

  const { min: SCORE_MIN, max: SCORE_MAX } = CONFIG.scoreRange;

  const engagementRate =
    followers > 0 ? ((avgLikesAll + avgCommentsAll) / followers) * 100 : 0;

  const engagementScore =
    tier === CONFIG.tiers.celebrity.label
      ? clamp((engagementRate / CONFIG.engagement.celebrityDivisor) * SCORE_MAX, SCORE_MIN, SCORE_MAX)
      : clamp(engagementRate * CONFIG.engagement.standardMultiplier, SCORE_MIN, SCORE_MAX);

  const mid         = Math.floor(items.length / 2);
  const recentAvg   = avg(items.slice(0, mid).map(p => p.likesCount || 0));
  const olderAvg    = avg(items.slice(mid).map(p => p.likesCount || 0)) || 1;
  const growthScore = clamp(((recentAvg / olderAvg) - 1) * SCORE_MAX + CONFIG.growth.baselineOffset, SCORE_MIN, SCORE_MAX);

  const meanLikes        = avg(items.map(p => Number(p.likesCount) || 0));
  const variance         = avg(items.map(p => Math.abs((p.likesCount || 0) - meanLikes)));
  const rawConsistency   = SCORE_MAX - (variance / (meanLikes || 1)) * SCORE_MAX;
  const consistencyScore = clamp(Math.max(rawConsistency, consistencyFloor), SCORE_MIN, SCORE_MAX);

  const healthScore = Math.round(
    weights.engagement  * engagementScore +
    weights.growth      * growthScore +
    weights.consistency * consistencyScore
  );

  /* ---------- FINAL RETURN ---------- */
  return {
    username,
    followers,
    accountTier: tier,

    imagePosts: {
      count:           imagePosts.length,
      averageLikes:    Math.round(avg(imageLikes)),
      averageComments: Math.round(avg(imageComments)),
    },

    reels: {
      count:           reels.length,
      averageLikes:    Math.round(avg(reelLikes)),
      averageComments: Math.round(avg(reelComments)),
      averageViews:    Math.round(avg(reelViews)),
    },

    topViewedPosts,
    commentsText,
    sentiment,

    profileHealth: {
      score:         healthScore,
      engagementRate: Number(engagementRate.toFixed(2)),
      weights,
      components: {
        engagement:  Math.round(engagementScore),
        growth:      Math.round(growthScore),
        consistency: Math.round(consistencyScore),
      },
    },
  };
}