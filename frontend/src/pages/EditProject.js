import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

function EditProject() {
  const [formData, setFormData] = useState({
    websiteName: '',
    country: '',
    city: '',
    websiteUrl: '',
    spreadsheetUrl: '',
    keywords: ''
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  const { websiteName, country, city, websiteUrl,spreadsheetUrl, keywords } = formData;

  // Fetch project data on component mount
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = Cookies.get('userCookie');
        if (!token) {
          navigate('/admin');
          return;
        }

        const config = {
          headers: {
            "Content-Type": "application/json"
          },
          withCredentials: true
        }

        const res = await axios.get(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}`, config);

        // Format keywords array into string for textarea
        const keywordsString = res.data.keywords.join('\n');

        setFormData({
          websiteName: res.data.websiteName || '',
          country: res.data.country || '',
          city: res.data.city || '',
          websiteUrl: res.data.websiteUrl || '',
          spreadsheetUrl: res.data.spreadsheet.spreadsheetUrl || '',
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
      const token = Cookies.get('userCookie');

      if (!token) {
        setError('Authentication error. Please login again.');
        setSubmitting(false);
        navigate('/admin');
        return;
      }

      // const toastId = toast.loading('Updating project...');

      const config = {
        headers: {
          "Content-Type": "application/json"
        },
        withCredentials: true
      }

      await axios.put(
        `${process.env.REACT_APP_SERVER_URL}/api/projects/${id}`,
        formData,
        config
      );

      // toast.dismiss(toastId);
      toast.success('Project updated successfully!');

      setSuccess(true);
      setSubmitting(false);

      // Redirect to project details page after 2 seconds
      setTimeout(() => {
        navigate(`/project/${id}`);
      }, 0);

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
        </div>
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