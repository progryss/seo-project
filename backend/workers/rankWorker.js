require("dotenv").config();

const connectDB = require("../config/db");
connectDB();

const axios = require("axios");
const { Worker } = require("bullmq");
const { connection } = require("../queues/redis.js");
const Project = require("../models/projects/projectModel.js");

console.log("🚀 Rank Worker Booting...");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
--------------------------------------------------
Normalize Domain
--------------------------------------------------
*/
function normalizeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/*
--------------------------------------------------
Safer Host Matching
--------------------------------------------------
*/
function hostMatches(link, domain) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "").toLowerCase();
    return host === domain || host.endsWith("." + domain);
  } catch {
    return false;
  }
}

/*
--------------------------------------------------
Country → Google Location Code
--------------------------------------------------
*/
function getCountryCode(country) {
  if (!country) return "us";

  const map = {
    india: "in",
    usa: "us",
    "united states": "us",
    uk: "uk",
    "united kingdom": "uk"
  };

  return map[country.toLowerCase()] || "us";
}

/*
--------------------------------------------------
Fetch Ranking (Top 100)
--------------------------------------------------
*/
async function fetchRank(keyword, domain, countryCode) {

  const perPage = 10;
  const maxPages = 10;

  for (let page = 1; page <= maxPages; page++) {

    const res = await axios.post(
      "https://google.serper.dev/search",
      {
        q: keyword,
        gl: countryCode,
        hl: "en",
        autocorrect: false,
        page,
        num: perPage,
        type: "search",
        uule: null,
      },
      {
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000
      }
    );

    const organic = res.data.organic || [];

    for (let i = 0; i < organic.length; i++) {

      const link = organic[i]?.link;

      if (link && hostMatches(link, domain)) {

        return {
          ranking: (page - 1) * perPage + (i + 1),
          rankingUrl: link
        };
      }
    }

    await sleep(500);
  }

  return { ranking: null, rankingUrl: null };
}

/*
--------------------------------------------------
Worker Logic
--------------------------------------------------
*/
const worker = new Worker(
  "rank-check",
  async (job) => {

    console.log("⚙️ Worker picked job:", job.data);

    const { projectId, keyword } = job.data;

    const project = await Project.findById(projectId);
    if (!project) {
      console.log("❌ Project missing");
      return;
    }

    const domain = normalizeDomain(project.websiteUrl);
    const countryCode = getCountryCode(project.country);

    const prev =
      project.rankings?.find((r) => r.keyword === keyword) || {};

    let { ranking, rankingUrl } = await fetchRank(
      keyword,
      domain,
      countryCode
    );

    if (ranking === null) {

      console.log("⚠ Retry SERP once...");

      await sleep(3000);

      const retryResult = await fetchRank(
        keyword,
        domain,
        countryCode
      );

      ranking = retryResult.ranking;
      rankingUrl = retryResult.rankingUrl;
    }

    const updatedRanking = {
      keyword,
      ranking,
      previousRanking: prev.ranking ?? null,
      rankingUrl,
      searchEngine: `google.${countryCode}`,
      checkedAt: new Date(),
    };

    console.log("💾 Saving ranking:", updatedRanking);

    /*
    ---------------------------------------------
    Safe Mongo Updates
    ---------------------------------------------
    */

    await Project.updateOne(
      { _id: projectId },
      { $pull: { rankings: { keyword } } }
    );

    await Project.updateOne(
      { _id: projectId },
      {
        $push: { rankings: updatedRanking },
        $inc: { rankCheckDone: 1 },
        $set: { rankCheckUpdatedAt: new Date() }
      }
    );

    const updatedProject = await Project.findById(projectId);

    console.log(
      `📊 Progress ${updatedProject.rankCheckDone || 0}/${updatedProject.rankCheckTotal || 0}`
    );

    /*
    ---------------------------------------------
    Completion Check
    ---------------------------------------------
    */
    if (
      updatedProject.rankCheckDone >=
      updatedProject.rankCheckTotal
    ) {

      console.log("✅ Ranking completed");

      await Project.updateOne(
        { _id: projectId },
        { rankCheckStatus: "completed" }
      );
    }

    await sleep(1200 + Math.random() * 800)
  },
  {
    connection,
    concurrency: 1,
  }
);

/*
--------------------------------------------------
Worker Debug Events
--------------------------------------------------
*/
worker.on("completed", (job) => {
  console.log(`✅ Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`💥 Job failed: ${job?.id}`, err);
});

worker.on("error", (err) => {
  console.error("🚨 Worker error:", err);
});

console.log("🧠 Rank Worker Ready");
