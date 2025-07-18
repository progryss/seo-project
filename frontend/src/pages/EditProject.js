import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EditProject() {
  const [formData, setFormData] = useState({
    websiteName: '',
    country: '',
    city: '',
    websiteUrl: '',
    keywords: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { websiteName, country, city, websiteUrl, keywords } = formData;
  
  // Fetch project data on component mount
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/admin');
          return;
        }

        const res = await axios.get(`http://localhost:5000/api/projects/${id}`, {
          headers: {
            'x-auth-token': token
          }
        });

        // Format keywords array into string for textarea
        const keywordsString = res.data.keywords.join('\n');
        
        setFormData({
          websiteName: res.data.websiteName || '',
          country: res.data.country || '',
          city: res.data.city || '',
          websiteUrl: res.data.websiteUrl || '',
          keywords: keywordsString || ''
        });
        
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.msg || 'Error fetching project details');
        setLoading(false);
        console.error(err);
      }
    };

    fetchProject();
  }, [id, navigate]);
  
  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    // Basic validation
    if (!websiteName || !country || !websiteUrl) {
      setError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication error. Please login again.');
        setSubmitting(false);
        navigate('/admin');
        return;
      }
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      };
      
      await axios.put(
        `http://localhost:5000/api/projects/${id}`,
        formData,
        config
      );
      
      setSuccess(true);
      setSubmitting(false);
      
      // Redirect to project details page after 2 seconds
      setTimeout(() => {
        navigate(`/project/${id}`);
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.msg || 'Error updating project');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/project/${id}`);
  };
  
  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }
  
  return (
    <div className="edit-project-container">
      <div className="edit-project-header">
        <h1>Edit Project</h1>
        <button onClick={handleCancel} className="back-button">
          Cancel
        </button>
      </div>
      
      {success && (
        <div className="success-message">
          Project updated successfully! Redirecting...
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="project-form">
        <div className="form-group">
          <label htmlFor="websiteName">Website Name *</label>
          <input
            type="text"
            id="websiteName"
            name="websiteName"
            value={websiteName}
            onChange={handleChange}
            placeholder="Enter website name"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="country">Country *</label>
          <input
            type="text"
            id="country"
            name="country"
            value={country}
            onChange={handleChange}
            placeholder="Enter country"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="city">City (Optional)</label>
          <input
            type="text"
            id="city"
            name="city"
            value={city}
            onChange={handleChange}
            placeholder="Enter city (optional)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="websiteUrl">Website URL *</label>
          <input
            type="url"
            id="websiteUrl"
            name="websiteUrl"
            value={websiteUrl}
            onChange={handleChange}
            placeholder="Enter website URL (e.g., https://example.com)"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="keywords">Keywords (one per line)</label>
          <textarea
            id="keywords"
            name="keywords"
            value={keywords}
            onChange={handleChange}
            placeholder="Enter keywords (one per line)"
            rows="6"
          />
          <small className="form-text">
            You can paste multiple keywords from Excel, separated by new lines, commas, or tabs.
          </small>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button" 
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Project'}
          </button>
          
          <button 
            type="button" 
            className="cancel-button" 
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProject; 