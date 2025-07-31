const mongoose = require('mongoose');
const {Schema} = mongoose;

// Project Schema
const projectSchema = new mongoose.Schema({
  websiteName: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: false },
  websiteUrl: { type: String, required: true },
  keywords: [{ type: String }],
  rankings: [{
    keyword: { type: String },
    ranking: { type: Number },
    previousRanking: { type: Number },
    rankingUrl: { type: String },
    searchEngine: { type: String },
    checkedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;