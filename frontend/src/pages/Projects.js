import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/projects', {
          headers: {
            'x-auth-token': token
          }
        });
        
        setProjects(res.data || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to load projects');
        setLoading(false);
        console.error(err);
      }
    };

    fetchProjects();
  }, []);

  const handleAddProject = () => {
    navigate('/add-project');
  };

  const handleViewProject = (id) => {
    navigate(`/project/${id}`);
  };

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1>SEO Projects</h1>
        <div className="header-buttons">
          <button onClick={handleAddProject} className="add-button">
            Add New Project
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="projects-list">
        {projects.length === 0 ? (
          <div className="no-projects">
            <p>No projects found.</p>
            <button onClick={handleAddProject} className="add-button">
              Create your first project
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project._id} className="project-card">
              <h3>{project.websiteName}</h3>
              <p><strong>URL:</strong> <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer">{project.websiteUrl}</a></p>
              <p><strong>Location:</strong> {project.city ? `${project.city}, ${project.country}` : project.country}</p>
              <p><strong>Keywords:</strong> {project.keywords.length}</p>
              <div className="project-actions">
                <button 
                  className="view-button"
                  onClick={() => handleViewProject(project._id)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Projects; 