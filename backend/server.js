const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Added axios for Google Serper API

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seo-project';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

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
    rankingUrl: { type: String },
    searchEngine: { type: String },
    checkedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'seo-project-secret-key';

// Initialize admin user
const initAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ email: 'progryss@gmail.com' });
    
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Progryss@13579', salt);
      
      await User.create({
        email: 'progryss@gmail.com',
        password: hashedPassword
      });
      
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

initAdminUser();

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Basic route
app.get('/', (req, res) => {
  res.send('SEO Project API is running');
});

// Auth Routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    
    // Return JWT
    const payload = {
      user: {
        id: user.id
      }
    };
    
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Project Routes
// Get all projects
app.get('/api/projects', auth, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a single project by ID
app.get('/api/projects/:id', auth, async (req, res) => {
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
});

// Update a project by ID
app.put('/api/projects/:id', auth, async (req, res) => {
  const { websiteName, country, city, websiteUrl, keywords } = req.body;
  
  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    // Process keywords if they come as a string (from Excel paste)
    let keywordsArray = keywords;
    if (typeof keywords === 'string') {
      // Split by newline, comma, or tab and filter empty strings
      keywordsArray = keywords
        .split(/[\n,\t]+/)
        .map(keyword => keyword.trim())
        .filter(keyword => keyword !== '');
    }
    
    // Build project object
    const projectFields = {
      websiteName: websiteName || project.websiteName,
      country: country || project.country,
      city: city,
      websiteUrl: websiteUrl || project.websiteUrl,
      keywords: keywordsArray || project.keywords
    };
    
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
});

// Create a project
app.post('/api/projects', auth, async (req, res) => {
  const { websiteName, country, city, websiteUrl, keywords } = req.body;
  
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
      keywords: keywordsArray
    });
    
    const project = await newProject.save();
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get saved rankings for a project
app.get('/api/projects/:id/saved-rankings', auth, async (req, res) => {
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
});

// Check and update keyword rankings for a project
app.get('/api/projects/:id/rankings', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
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
    
    // Prepare to fetch rankings for each keyword
    const keywordPromises = project.keywords.map(async (keyword) => {
      try {
        const data = JSON.stringify({
          "q": keyword,
          "location": location || undefined,
          "gl": gl,
          "num": 100
        });
        
        const config = {
          method: 'post',
          maxBodyLength: Infinity,
          url: 'https://google.serper.dev/search',
          headers: { 
            'X-API-KEY': 'd08413c2e0c14cf82b3b93c47d1950886970b69e', 
            'Content-Type': 'application/json'
          },
          data: data
        };
        
        const response = await axios.request(config);
        const searchResults = response.data.organic || [];
        
        // Find if the website appears in the search results
        let ranking = null;
        let rankingUrl = null;
        
        for (let i = 0; i < searchResults.length; i++) {
          const result = searchResults[i];
          if (result.link && result.link.includes(domain)) {
            ranking = i + 1;
            rankingUrl = result.link;
            break;
          }
        }
        
        return {
          keyword,
          ranking,
          rankingUrl,
          searchEngine: `google.${gl}`
        };
      } catch (err) {
        console.error(`Error fetching ranking for keyword "${keyword}":`, err.message);
        return {
          keyword,
          ranking: null,
          rankingUrl: null,
          error: 'Failed to fetch ranking'
        };
      }
    });
    
    // Wait for all keyword rankings to be fetched
    const rankings = await Promise.all(keywordPromises);
    
    // Update project with new rankings
    project.rankings = rankings.map(ranking => ({
      ...ranking,
      checkedAt: new Date()
    }));
    
    // Save the project with the updated rankings
    await project.save();
    
    res.json(rankings);
  } catch (err) {
    console.error(err.message);
    
    // Check if error is due to invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    res.status(500).send('Server error');
  }
});

// Check rankings for selected keywords only
app.post('/api/projects/:id/check-rankings', auth, async (req, res) => {
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
    
    // Prepare to fetch rankings for selected keywords only
    const keywordPromises = keywords.map(async (keyword) => {
      try {
        const data = JSON.stringify({
          "q": keyword,
          "location": location || undefined,
          "gl": gl,
          "num": 100
        });
        
        const config = {
          method: 'post',
          maxBodyLength: Infinity,
          url: 'https://google.serper.dev/search',
          headers: { 
            'X-API-KEY': 'd08413c2e0c14cf82b3b93c47d1950886970b69e', 
            'Content-Type': 'application/json'
          },
          data: data
        };
        
        const response = await axios.request(config);
        const searchResults = response.data.organic || [];
        
        // Find if the website appears in the search results
        let ranking = null;
        let rankingUrl = null;
        
        for (let i = 0; i < searchResults.length; i++) {
          const result = searchResults[i];
          if (result.link && result.link.includes(domain)) {
            ranking = i + 1;
            rankingUrl = result.link;
            break;
          }
        }
        
        return {
          keyword,
          ranking,
          rankingUrl,
          searchEngine: `google.${gl}`,
          checkedAt: new Date()
        };
      } catch (err) {
        console.error(`Error fetching ranking for keyword "${keyword}":`, err.message);
        return {
          keyword,
          ranking: null,
          rankingUrl: null,
          error: 'Failed to fetch ranking',
          checkedAt: new Date()
        };
      }
    });
    
    // Wait for all keyword rankings to be fetched
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
    
    res.json(mergedRankings);
  } catch (err) {
    console.error(err.message);
    
    // Check if error is due to invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    res.status(500).send('Server error');
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 