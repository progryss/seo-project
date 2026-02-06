const axios = require("axios");
const Bottleneck = require("bottleneck");
require("dotenv").config();

const { rankQueue } = require("../queues/rankQueue.js");
const Project = require("../models/projects/projectModel.js");
const { googlesheets } = require("../services/google/index.js");
const updateSpreadsheet = require("../services/google/updateSpreadsheet.js");

// 1. Setup Bottleneck limiter (base settings as per API docs)
const limiter = new Bottleneck({
  maxConcurrent: 3, // adjust to safe value per API docs
  minTime: 200, // adjust for base API rate, e.g. 5/sec
});

// 2. Helper: sleep for X ms
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

const updateProject = async (req, res) => {
  const { websiteName, country, city, websiteUrl, keywords, spreadsheetUrl } =
    req.body;

  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    // Process keywords if they come as a string (from Excel paste)
    let keywordsArray = keywords;

    let rankings;
    if (typeof keywords === "string") {
      // Split by newline, comma, or tab and filter empty strings
      keywordsArray = keywords
        .split(/[\n,\t]+/)
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword !== "");
      rankingArray = project.rankings.filter((item) =>
        keywordsArray.some((keyword) => item.keyword === keyword),
      );
    }
    let spreadsheetData = {
      spreadsheetUrl: spreadsheetUrl,
    };

    // Build project object
    const projectFields = {
      websiteName: websiteName || project.websiteName,
      country: country || project.country,
      city: city,
      websiteUrl: websiteUrl || project.websiteUrl,
      keywords: keywordsArray || project.keywords,
      rankings: rankingArray,
    };

    if (
      spreadsheetUrl &&
      spreadsheetUrl !== project.spreadsheet.spreadsheetUrl
    ) {
      projectFields.spreadsheet = spreadsheetData;
    } else if (spreadsheetUrl === "") {
      projectFields.spreadsheet = {};
    }

    // Update project
    project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: projectFields },
      { new: true },
    );

    res.json(project);
  } catch (err) {
    console.error(err.message);

    // Check if error is due to invalid ObjectId format
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.status(500).send("Server error");
  }
};

const getSingleProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    console.error(err.message);

    // Check if error is due to invalid ObjectId format
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.status(500).send("Server error");
  }
};

const getSingleProjectRankingStatus = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.status(200).send({
      rankCheckStatus: project.rankCheckStatus,
      rankCheckDone: project.rankCheckDone,
      rankCheckTotal: project.rankCheckTotal,
      rankCheckError: project.rankCheckError,
    });

  } catch (err) {

    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }
    res.status(500).send("Server error");

  }
};

const deleteSingleProject = async (req, res) => {
  const projectId = req.params.id;
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }
    res
      .status(200)
      .json({ message: `Project with id ${projectId} deleted successfully` });
  } catch (err) {
    console.error(err.message);
    res
      .status(500)
      .json({ message: `Project with id ${projectId} deleting error` });
  }
};

const createProject = async (req, res) => {
  const { websiteName, country, city, websiteUrl, keywords, spreadsheetUrl } =
    req.body;

  try {
    // Process keywords if they come as a string (from Excel paste)
    let keywordsArray = keywords;
    if (typeof keywords === "string") {
      // Split by newline, comma, or tab and filter empty strings
      keywordsArray = keywords
        .split(/[\n,\t]+/)
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword !== "");
    }

    const newProject = new Project({
      websiteName,
      country,
      city,
      websiteUrl,
      spreadsheet: {
        spreadsheetUrl: spreadsheetUrl || "",
      },
      keywords: keywordsArray,
      rankings: [],
    });

    const project = await newProject.save();
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

const savedRankingForProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    // Return the saved rankings or empty array if none exist
    res.json(project.rankings || []);
  } catch (err) {
    console.error(err.message);

    // Check if error is due to invalid ObjectId format
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.status(500).send("Server error");
  }
};

const checkRankingForSelectedKeywords = async (req, res) => {
  try {

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const { keywords } = req.body;

    if (!keywords?.length) {
      return res.status(400).json({ msg: "No keywords selected" });
    }

    if (project.rankCheckStatus === "running") {
      return res.json({ rankCheckStatus: "running" });
    }

    project.rankCheckStatus = "running";
    project.rankCheckStartedAt = new Date();
    project.rankCheckUpdatedAt = new Date();
    project.rankCheckError = null;

    project.rankCheckTotal = keywords.length;
    project.rankCheckDone = 0;

    await project.save();

    // Add jobs
    for (const keyword of keywords) {
      await rankQueue.add("rank-one-keyword", {
        projectId: project._id.toString(),
        keyword,
      });
    }

    console.log("All jobs queued");

    res.status(202).json({
      msg: "Jobs queued",
      total: keywords.length,
    });

  } catch (err) {

    console.error("Controller Error:", err);
    res.status(500).json({ msg: "Server error" });

  }
};

// link google sheet to project
const linkSheetToProject = async (req, res) => {
  try {
    const { spreadsheetUrl } = req.body;

    if (!spreadsheetUrl) {
      return res.status(400).json({ msg: "Spreadsheet URL is required" });
    }

    // getting spreadsheet ids from the URL
    function getSpreadsheetIds(sheetUrl) {
      const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/);

      return {
        spreadsheetId: idMatch ? idMatch[1] : null,
        sheetId: gidMatch ? gidMatch[1] : null,
      };
    }

    const getIds = getSpreadsheetIds(spreadsheetUrl);

    let spreadsheetId = getIds.spreadsheetId;
    const meta = await googlesheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const sheetInfo = {
      spreadsheetUrl: spreadsheetUrl,
      spreadsheetId: meta.data.spreadsheetId,
      spreadsheetTitle: meta.data.properties.title,
      sheets: meta.data.sheets
        .filter((sheet) => sheet.properties.sheetId === Number(getIds.sheetId))
        .map((sheet) => ({
          tabName: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          index: sheet.properties.index || 0,
          hidden: sheet.properties.hidden || false,
          rowCount: sheet.properties.gridProperties.rowCount || 0,
          columnCount: sheet.properties.gridProperties.columnCount || 0,
        })),
    };

    let project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          spreadsheet: sheetInfo,
        },
      },
      { new: true },
    );
    res.status(200).send({
      project: project,
      message: "Spreadsheet linked successfully",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send({
      message: "Error linking spreadsheet to project",
    });
  }
};

const updateGoogleSheet = async (req, res) => {
  try {
    let response = await updateSpreadsheet(req.params.id);
    res.status(200).send("Google Sheet Updated Successfully");
  } catch (error) {
    console.log("error in updating sheet");
    res.status(500).send("Error in Updating Google Sheet !");
  }
};

module.exports = {
  updateGoogleSheet,
  updateProject,
  linkSheetToProject,
  getAllProjects,
  getSingleProject,
  deleteSingleProject,
  createProject,
  savedRankingForProject,
  checkRankingForSelectedKeywords,
  getSingleProjectRankingStatus,
};
