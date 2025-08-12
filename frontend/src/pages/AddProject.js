import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { spread } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

function AddProject() {
  const [formData, setFormData] = useState({
    websiteName: '',
    country: '',
    city: '',
    websiteUrl: '',
    spreadsheetUrl: '',
    keywords: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const { websiteName, country, city, websiteUrl, spreadsheetUrl, keywords } = formData;

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!websiteName || !country || !websiteUrl) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const token = Cookies.get('userCookie');

      if (!token) {
        setError('Authentication error. Please login again.');
        setLoading(false);
        navigate('/admin');
        return;
      }

      const config = {
        headers: {
          "Content-Type": "application/json"
        },
        withCredentials: true
      }

      await axios.post(
        `${process.env.REACT_APP_SERVER_URL}/api/projects`,
        formData,
        config
      );

      setSuccess(true);
      setLoading(false);

      // Clear form
      setFormData({
        websiteName: '',
        country: '',
        city: '',
        websiteUrl: '',
        spreadsheetUrl: '',
        keywords: ''
      });

      // Redirect to projects page after 2 seconds
      setTimeout(() => {
        navigate('/projects');
      }, 0);

      toast.success('Project created successfully!')

    } catch (err) {
      setError(err.response?.data?.msg || 'Error creating project');
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/projects');
  };

  return (
    <div className="add-project-container">
      <div className="add-project-header">
        <h1>Add New Project</h1>
        <button onClick={handleBack} className="back-button">
          Back to Projects
        </button>
      </div>

      {success && (
        <div className="success-message">
          Project created successfully! Redirecting to projects page...
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="project-form">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
          <div>
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
              <label htmlFor="spreadsheetUrl">Google Sheet URL *</label>
              <input
                type="url"
                id="spreadsheetUrl"
                name="spreadsheetUrl"
                value={spreadsheetUrl}
                onChange={handleChange}
                placeholder="Enter Google Sheet URL"
              />
            </div>
          </div>
          <div>
            <div className="form-group">
              <label htmlFor="keywords">Keywords (paste from Excel)</label>
              <textarea
                id="keywords"
                name="keywords"
                value={keywords}
                onChange={handleChange}
                placeholder="Paste keywords from Excel (one per line or comma separated)"
                rows="6"
              />
              <small className="form-text">
                You can paste multiple keywords from Excel, separated by new lines, commas, or tabs.
              </small>
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Add Project'}
        </button>
      </form>
    </div>
  );
}

export default AddProject; 