const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

const { updateProject, getAllProjects, deleteSingleProject, getSingleProject, createProject, savedRankingForProject, updateRankingForProject, checkRankingForSelectedKeywords } = require('./controllers/projectControllers.js');
const auth = require('./middlewares/auth.js');
const initAdminUser = require('./middlewares/createAdminUser.js');
const { login } = require('./controllers/userControllers.js');

// Create Express app
const app = express();
app.use(cookieParser());

// CORS setup
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
}));

app.use(express.json());



// Auth Routes
app.post('/api/login', login);

// Project Routes
// Get all projects
app.get('/api/projects', auth, getAllProjects);

// Get a single project by ID
app.get('/api/projects/:id', auth, getSingleProject);

// delete a single project by ID
app.delete('/api/projects/:id', auth, deleteSingleProject);

// Update a project by ID
app.put('/api/projects/:id', auth, updateProject);

// Create a project
app.post('/api/projects', auth, createProject);

// Get saved rankings for a project
app.get('/api/projects/:id/saved-rankings', auth, savedRankingForProject);

// Check and update keyword rankings for a project
app.get('/api/projects/:id/rankings', auth, updateRankingForProject);

// Check rankings for selected keywords only
app.post('/api/projects/:id/check-rankings', auth, checkRankingForSelectedKeywords);


// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  // MongoDB Connection
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
  console.log(`Server running on port ${PORT}`);
  initAdminUser();
}); 