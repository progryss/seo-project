const { google } = require('googleapis');
require('dotenv').config();

// 1. Setup OAuth2 client with your credentials and refresh token
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
  process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
  process.env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL
);

// Use your refresh token!
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN });

const googlesheets = google.sheets({ version: 'v4', auth: oauth2Client });

// 2. Setup the Search Console API
const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

module.exports = { searchconsole,googlesheets };
