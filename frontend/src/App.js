import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Projects from './pages/Projects';
import AddProject from './pages/AddProject';
import ProjectDetail from './pages/ProjectDetail';
import EditProject from './pages/EditProject';

// Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Context
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Login />} />
            
            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/projects" element={<Projects />} />
              <Route path="/add-project" element={<AddProject />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/project/edit/:id" element={<EditProject />} />
            </Route>
            
            {/* Redirect any unknown routes to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
