const { Queue } = require("bullmq");
const { connection } = require("./redis");

console.log("📦 Creating Rank Queue...");

const rankQueue = new Queue("rank-check", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

module.exports = { rankQueue };
