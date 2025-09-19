const axios = require('axios');
const Bottleneck = require('bottleneck');
require('dotenv').config();

const Project = require('../models/projects/projectModel.js')
const { googlesheets } = require('../services/google/index.js');
const updateSpreadsheet = require('../services/google/updateSpreadsheet.js')

// 1. Setup Bottleneck limiter (base settings as per API docs)
const limiter = new Bottleneck({
  maxConcurrent: 3,    // adjust to safe value per API docs
  minTime: 200         // adjust for base API rate, e.g. 5/sec
});

// 2. Helper: sleep for X ms
const sleep = ms => new Promise(res => setTimeout(res, ms));


const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
}

const updateProject = async (req, res) => {
  const { websiteName, country, city, websiteUrl, keywords, spreadsheetUrl } = req.body;

  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Process keywords if they come as a string (from Excel paste)
    let keywordsArray = keywords;

    let rankings;
    if (typeof keywords === 'string') {
      // Split by newline, comma, or tab and filter empty strings
      keywordsArray = keywords
        .split(/[\n,\t]+/)
        .map(keyword => keyword.trim())
        .filter(keyword => keyword !== '');
      rankingArray = project.rankings.filter(item =>
        keywordsArray.some(keyword => item.keyword === keyword)
      );
    }
    let spreadsheetData = {
      spreadsheetUrl: spreadsheetUrl,
    }

    // Build project object
    const projectFields = {
      websiteName: websiteName || project.websiteName,
      country: country || project.country,
      city: city,
      websiteUrl: websiteUrl || project.websiteUrl,
      keywords: keywordsArray || project.keywords,
      rankings: rankingArray,
    };

    if (spreadsheetUrl && spreadsheetUrl !== project.spreadsheet.spreadsheetUrl) {
      projectFields.spreadsheet = spreadsheetData;
    }else if(spreadsheetUrl === ''){
      projectFields.spreadsheet = {};
    }

    // Update project
    project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: projectFields },
      { new: true }
    );

    res.json(project);
  } catch (err) {
    console.error(err.message);

    // Check if error is due to invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }

    res.status(500).send('Server error');
  }
}

const getSingleProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    console.error(err.message);

    // Check if error is due to invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }

    res.status(500).send('Server error');
  }
}

const deleteSingleProject = async (req, res) => {
  const projectId = req.params.id;
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }
    res.status(200).json({ message: `Project with id ${projectId} deleted successfully` });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: `Project with id ${projectId} deleting error` });
  }
}

const createProject = async (req, res) => {
  const { websiteName, country, city, websiteUrl, keywords, spreadsheetUrl } = req.body;

  try {
    // Process keywords if they come as a string (from Excel paste)
    let keywordsArray = keywords;
    if (typeof keywords === 'string') {
      // Split by newline, comma, or tab and filter empty strings
      keywordsArray = keywords
        .split(/[\n,\t]+/)
        .map(keyword => keyword.trim())
        .filter(keyword => keyword !== '');
    }

    const newProject = new Project({
      websiteName,
      country,
      city,
      websiteUrl,
      spreadsheet: {
        spreadsheetUrl: spreadsheetUrl || '',
      },
      keywords: keywordsArray,
      rankings: []
    });

    const project = await newProject.save();
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
}

const savedRankingForProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Return the saved rankings or empty array if none exist
    res.json(project.rankings || []);
  } catch (err) {
    console.error(err.message);

    // Check if error is due to invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }

    res.status(500).send('Server error');
  }
}

const checkRankingForSelectedKeywords = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Get the selected keywords from request body
    const { keywords } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ msg: 'Please select at least one keyword' });
    }

    // Get country code for Google search
    let gl = 'us'; // Default to US
    if (project.country) {
      // Map common country names to their codes
      const countryMap = {
        'united states': 'us',
        'usa': 'us',
        'united kingdom': 'uk',
        'uk': 'uk',
        'india': 'in',
        'australia': 'au',
        'canada': 'ca',
        'germany': 'de',
        'france': 'fr',
        'japan': 'jp',
        'brazil': 'br',
        'italy': 'it',
        'spain': 'es',
        'russia': 'ru',
        'mexico': 'mx',
        'south korea': 'kr',
        'indonesia': 'id',
        'turkey': 'tr',
        'netherlands': 'nl',
        'saudi arabia': 'sa',
        'switzerland': 'ch',
        'sweden': 'se',
        'poland': 'pl',
        'belgium': 'be',
        'thailand': 'th',
        'ireland': 'ie',
        'austria': 'at',
        'norway': 'no',
        'denmark': 'dk',
        'singapore': 'sg',
        'hong kong': 'hk',
        'finland': 'fi',
        'new zealand': 'nz',
        'israel': 'il',
        'greece': 'gr',
        'portugal': 'pt',
        'czech republic': 'cz',
        'romania': 'ro',
        'hungary': 'hu',
        'vietnam': 'vn',
        'malaysia': 'my',
        'philippines': 'ph',
        'south africa': 'za',
        'pakistan': 'pk',
        'chile': 'cl',
        'colombia': 'co',
        'bangladesh': 'bd',
        'egypt': 'eg',
        'argentina': 'ar',
        'morocco': 'ma',
        'nigeria': 'ng',
        'kenya': 'ke',
        'peru': 'pe',
        'sri lanka': 'lk',
        'ukraine': 'ua'
      };

      const countryLower = project.country.toLowerCase();
      gl = countryMap[countryLower] || gl;
    }

    // Get location string if city is available
    let location = '';
    if (project.city && project.country) {
      location = `${project.city}, ${project.country}`;
    }

    // Extract domain from website URL for ranking check
    let domain = '';
    try {
      const url = new URL(project.websiteUrl);
      domain = url.hostname.replace('www.', '');
    } catch (err) {
      console.error('Invalid URL:', project.websiteUrl);
    }

    // 3. Modified function for header-aware rate limit
   async function fetchRankingWithRateLimit(keyword, project, domain, location, gl) {
  const rankingData = project.rankings.find(r => r.keyword === keyword) || {};
  let ranking = null;
  let rankingUrl = null;

  try {
    const maxPages = 10; // adjust as needed
    const resultsPerPage = 10; // default per Serper
    let currentPage = 0;

    while (currentPage < maxPages && ranking === null) {
      const data = {
        q: keyword,
        location: location || undefined,
        gl: gl,
        num: resultsPerPage,
        page: currentPage + 1 // <-- NEW: page parameter
      };

      const config = {
        method: 'post',
        url: 'https://google.serper.dev/search',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        data
      };

      const response = await axios.request(config);
      const searchResults = response.data.organic || [];

      // Handle rate-limit headers if needed
      const remaining = parseInt(response.headers['x-ratelimit-remaining']);
      const reset = parseInt(response.headers['x-ratelimit-reset']);
      if (remaining === 0 && reset) {
        const now = Math.floor(Date.now() / 1000);
        const wait = (reset - now) * 1000;
        if (wait > 0) {
          console.log(`[${keyword}] Rate limit hit. Pausing for ${Math.ceil(wait / 1000)}s`);
          await sleep(wait);
        }
      }

      // Look for the domain in this page's results
      for (let i = 0; i < searchResults.length; i++) {
        const result = searchResults[i];
        if (result.link && result.link.includes(domain)) {
          ranking = currentPage * resultsPerPage + (i + 1);
          rankingUrl = result.link;
          break;
        }
      }

      currentPage++;
    }

    return {
      keyword,
      ranking,
      previousRanking: rankingData.ranking,
      rankingUrl,
      searchEngine: `google.${gl}`,
      checkedAt: new Date()
    };
  } catch (err) {
    console.error(`Error fetching ranking for keyword "${keyword}":`, err.message);
    return {
      keyword,
      ranking: null,
      previousRanking: rankingData.ranking,
      rankingUrl: null,
      searchEngine: `google.${gl}`,
      error: 'Failed to fetch ranking',
      checkedAt: new Date()
    };
  }
}


    // 4. Prepare to fetch rankings for selected keywords only, using Bottleneck
    const keywordPromises = keywords.map(keyword =>
      limiter.schedule(() => fetchRankingWithRateLimit(keyword, project, domain, location, gl))
    );

    // 5. Wait for all keyword rankings to be fetched
    const newRankings = await Promise.all(keywordPromises);

    // Get existing rankings that weren't selected for update
    const existingRankings = project.rankings || [];
    const existingKeywords = existingRankings.map(r => r.keyword);

    // Create a map of new rankings for quick lookup
    const newRankingsMap = {};
    newRankings.forEach(ranking => {
      newRankingsMap[ranking.keyword] = ranking;
    });

    // Merge existing and new rankings
    const mergedRankings = existingRankings.map(ranking => {
      // If this keyword was updated, use the new ranking
      if (newRankingsMap[ranking.keyword]) {
        return newRankingsMap[ranking.keyword];
      }
      // Otherwise keep the existing ranking
      return ranking;
    });

    // Add any new keywords that weren't in the existing rankings
    newRankings.forEach(ranking => {
      if (!existingKeywords.includes(ranking.keyword)) {
        mergedRankings.push(ranking);
      }
    });

    // Update project with merged rankings
    project.rankings = mergedRankings;

    // Save the project with the updated rankings
    await project.save();

    res.status(200).send(project.rankings);
  } catch (err) {
    console.error(err.message);

    // Check if error is due to invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }

    res.status(500).send('Server error');
  }
}

// link google sheet to project
const linkSheetToProject = async (req, res) => {

  try {

    const { spreadsheetUrl } = req.body;

    if (!spreadsheetUrl) {
      return res.status(400).json({ msg: 'Spreadsheet URL is required' });
    }

    // getting spreadsheet ids from the URL
    function getSpreadsheetIds(sheetUrl) {
      const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/);

      return {
        spreadsheetId: idMatch ? idMatch[1] : null,
        sheetId: gidMatch ? gidMatch[1] : null
      };
    }

    const getIds = getSpreadsheetIds(spreadsheetUrl);

    let spreadsheetId = getIds.spreadsheetId;
    const meta = await googlesheets.spreadsheets.get({ spreadsheetId: spreadsheetId });

    const sheetInfo = {
      spreadsheetUrl: spreadsheetUrl,
      spreadsheetId: meta.data.spreadsheetId,
      spreadsheetTitle: meta.data.properties.title,
      sheets: meta.data.sheets.filter(sheet => sheet.properties.sheetId === Number(getIds.sheetId)).map(sheet => ({
        tabName: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
        index: sheet.properties.index || 0,
        hidden: sheet.properties.hidden || false,
        rowCount: sheet.properties.gridProperties.rowCount || 0,
        columnCount: sheet.properties.gridProperties.columnCount || 0
      })),
    }

    let project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          spreadsheet: sheetInfo
        }
      },
      { new: true }
    );
    res.status(200).send({
      project: project,
      message: 'Spreadsheet linked successfully'
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send({
      message: 'Error linking spreadsheet to project'
    });
  }
}

const updateGoogleSheet = async (req, res) => {

  try {
    let response = await updateSpreadsheet(req.params.id)
    res.status(200).send('Google Sheet Updated Successfully')
  } catch (error) {
    console.log('error in updating sheet')
    res.status(500).send('Error in Updating Google Sheet !')
  }
}

module.exports = { updateGoogleSheet, updateProject, linkSheetToProject, getAllProjects, getSingleProject, deleteSingleProject, createProject, savedRankingForProject, checkRankingForSelectedKeywords };