const mongoose = require('mongoose');
const { Schema } = mongoose;

const sheetTabSchema = new mongoose.Schema({
  tabName:   { type: String },  // e.g., "Ranking"
  sheetId:   { type: Number },  // same as gid
  gid:       { type: Number },
  index:     { type: Number, default: 0 },      // tab order
  hidden:    { type: Boolean, default: false },
  rowCount:  { type: Number },
  columnCount:{ type: Number }
}, { _id: false });

// Project Schema
const projectSchema = new mongoose.Schema(
  {
    websiteName: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    city: {
      type: String
    },
    websiteUrl: {
      type: String,
      required: true
    },
    spreadsheet: {
      spreadsheetId: { type: String },
      spreadsheetUrl: { type: String },
      spreadsheetTitle: { type: String },         // useful to remember which tab user landed on
      sheets: { type: [sheetTabSchema], default: [] }
    },
    keywords: [
      {
        type: String
      }
    ],
    rankings: [
      {
        keyword: { type: String },
        ranking: { type: Number },
        previousRanking: { type: Number , default: null }, // previous ranking, can be null if not available
        rankingUrl: { type: String },
        searchEngine: { type: String },
        checkedAt: { type: Date, default: Date.now }
      }
    ],
    // ✅ NEW: ranking job status
    rankCheckStatus: {
      type: String,
      enum: ['idle', 'running', 'completed', 'failed'],
      default: 'idle'
    },

    rankCheckStartedAt: { type: Date },
    rankCheckUpdatedAt: { type: Date },
    rankCheckError: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;