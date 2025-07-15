import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function ProjectDetail() {
  const [project, setProject] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rankingsError, setRankingsError] = useState(null);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectAndRankings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/admin');
          return;
        }

        const projectRes = await axios.get(`http://localhost:5000/api/projects/${id}`, {
          headers: {
            'x-auth-token': token
          }
        });

        setProject(projectRes.data);
        
        // Fetch saved rankings if they exist
        const rankingsRes = await axios.get(`http://localhost:5000/api/projects/${id}/saved-rankings`, {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (rankingsRes.data && rankingsRes.data.length > 0) {
          setRankings(rankingsRes.data);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.msg || 'Error fetching project details');
        setLoading(false);
        console.error(err);
      }
    };

    fetchProjectAndRankings();
  }, [id, navigate]);

  // Set up selected keywords when project data is loaded
  useEffect(() => {
    if (project && project.keywords) {
      setSelectedKeywords([]);
      setSelectAll(false);
    }
  }, [project]);

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords([...project.keywords]);
    }
    setSelectAll(!selectAll);
  };

  // Handle individual keyword selection
  const handleKeywordSelect = (keyword) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedKeywords, keyword];
      setSelectedKeywords(newSelected);
      if (newSelected.length === project.keywords.length) {
        setSelectAll(true);
      }
    }
  };

  // Fetch rankings only for selected keywords
  const fetchKeywordRankings = async () => {
    if (selectedKeywords.length === 0) {
      setRankingsError('Please select at least one keyword to check rankings');
      return;
    }
    
    setRankingsLoading(true);
    setRankingsError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/admin');
        return;
      }

      // Send selected keywords to backend
      const res = await axios.post(`http://localhost:5000/api/projects/${id}/check-rankings`, 
        { keywords: selectedKeywords },
        {
          headers: {
            'x-auth-token': token
          }
        }
      );

      setRankings(res.data);
      setRankingsLoading(false);
    } catch (err) {
      setRankingsError(err.response?.data?.msg || 'Error fetching keyword rankings');
      setRankingsLoading(false);
      console.error(err);
    }
  };

  // Function to export the keywords table to CSV
  const exportToCSV = () => {
    if (!project || !project.keywords || project.keywords.length === 0) {
      return;
    }

    // Create CSV header row
    const csvHeader = ['Keyword', 'Ranking', 'Ranking URL', 'Last Checked'];
    
    // Create CSV data rows
    const csvData = project.keywords.map(keyword => {
      const rankingData = rankings.find(r => r.keyword === keyword) || {};
      
      return [
        keyword,
        rankingData.ranking ? `#${rankingData.ranking}` : (rankings.length > 0 ? 'Not in top 100' : '-'),
        rankingData.rankingUrl || '-',
        rankingData.checkedAt ? new Date(rankingData.checkedAt).toLocaleString() : '-'
      ];
    });
    
    // Combine header and data
    const csvContent = [
      csvHeader.join(','),
      ...csvData.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        if (cell && typeof cell === 'string') {
          // If cell contains comma, quote, or newline, wrap in quotes
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
        }
        return cell;
      }).join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.websiteName}_keywords_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    // Add to document, click and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBack = () => {
    navigate('/projects');
  };

  const handleEdit = () => {
    navigate(`/project/edit/${id}`);
  };

  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }

  if (error) {
    return (
      <div className="project-detail-container">
        <div className="error-message">{error}</div>
        <button onClick={handleBack} className="back-button">
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="project-detail-container">
      <div className="project-detail-header">
        <h1>{project.websiteName}</h1>
        <div className="header-buttons">
          <button onClick={handleEdit} className="edit-button">
            Edit Project
          </button>
          <button onClick={handleBack} className="back-button">
            Back to Projects
          </button>
        </div>
      </div>

      <div className="project-detail-content">
        <div className="detail-section">
          <h2>Website Information</h2>
          <div className="detail-item">
            <span className="detail-label">Website URL:</span>
            <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="detail-value url-value">
              {project.websiteUrl}
            </a>
          </div>
          <div className="detail-item">
            <span className="detail-label">Country:</span>
            <span className="detail-value">{project.country}</span>
          </div>
          {project.city && (
            <div className="detail-item">
              <span className="detail-label">City:</span>
              <span className="detail-value">{project.city}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Created:</span>
            <span className="detail-value">
              {new Date(project.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>

        <div className="detail-section">
          <div className="section-header">
            <h2>Keywords ({project.keywords.length})</h2>
            <div className="rankings-actions">
              <div className="selected-count">
                {selectedKeywords.length} of {project.keywords.length} selected
              </div>
              {!rankingsLoading && (
                <>
                  <button 
                    onClick={fetchKeywordRankings} 
                    className="check-rankings-button"
                    disabled={rankingsLoading || selectedKeywords.length === 0}
                  >
                    {rankings.length > 0 ? 'Refresh Rankings' : 'Check Rankings'}
                  </button>
                  <button 
                    onClick={exportToCSV}
                    className="export-csv-button"
                    disabled={project.keywords.length === 0}
                  >
                    Export CSV
                  </button>
                </>
              )}
            </div>
          </div>
          
          {rankingsError && (
            <div className="error-message">
              {rankingsError}
            </div>
          )}
          
          {rankingsLoading ? (
            <div className="loading">Fetching keyword rankings...</div>
          ) : (
            <>
              {project.keywords.length > 0 ? (
                <div className="keywords-table-container">
                  <table className="keywords-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            disabled={rankingsLoading}
                          />
                          Keyword
                        </th>
                        <th>Ranking</th>
                        <th>Ranking URL</th>
                        <th>Last Checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.keywords.map((keyword, index) => {
                        const rankingData = rankings.find(r => r.keyword === keyword) || {};
                        
                        return (
                          <tr key={index}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedKeywords.includes(keyword) || selectAll}
                                onChange={() => handleKeywordSelect(keyword)}
                                disabled={rankingsLoading}
                              />
                              {keyword}
                            </td>
                            <td className={rankingData.ranking ? 'ranking-value' : ''}>
                              {rankingData.ranking 
                                ? `#${rankingData.ranking}` 
                                : rankings.length > 0 
                                  ? 'Not in top 100'
                                  : '-'
                              }
                            </td>
                            <td>
                              {rankingData.rankingUrl ? (
                                <a 
                                  href={rankingData.rankingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ranking-url"
                                >
                                  {rankingData.rankingUrl}
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>
                              {rankingData.checkedAt ? (
                                new Date(rankingData.checkedAt).toLocaleString()
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-keywords">No keywords added for this project.</p>
              )}
              
              {rankings.length > 0 && (
                <div className="rankings-info">
                  <small>
                    Rankings checked in {rankings[0]?.searchEngine || 'Google'} on {
                      rankings[0]?.checkedAt 
                        ? new Date(rankings[0].checkedAt).toLocaleString() 
                        : new Date().toLocaleString()
                    }
                  </small>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail; 