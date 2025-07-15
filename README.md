# SEO Project

A full-stack application built with Node.js, Express, React, and MongoDB.

## Project Structure

```
seo-project/
├── backend/          # Express server
│   ├── server.js     # Main server file
│   └── .env          # Environment variables
├── frontend/         # React application
    ├── public/       # Static files
    └── src/          # React source code
        ├── components/ # Reusable components
        └── pages/    # Page components
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/seo-project
   ```

4. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

## Running the Application
- Backend API will run on: http://localhost:5000
- Frontend will run on: http://localhost:3000 