import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import TextField from '@mui/material/TextField';
import QueryTable from '../components/queryTable';
import Button from '@mui/material/Button';
import TuneIcon from '@mui/icons-material/Tune';
function ProjectDetail() {

  const [project, setProject] = useState(null);
  const [tabberState, setTabberState] = useState('keywords');
  const [sortOrder, setSortOrder] = useState(false)
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
        const token = Cookies.get('userCookie');
        if (!token) {
          navigate('/admin');
          return;
        }

        const projectRes = await axios.get(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}`, {
          headers: {
            "Content-Type": "application/json"
          },
          withCredentials: true
        });

        const sortedRanking = projectRes.data.rankings.sort((a, b) => {
          if (a.ranking === null) return 1;
          if (b.ranking === null) return -1;
          return b.ranking - a.ranking;
        })

        const rankingMap = sortedRanking.reduce((acc, { keyword, ranking }) => {
          acc[keyword] = ranking; // Store keyword -> ranking pair
          return acc;
        }, {});

        // console.log(rankingMap)

        const sortedKeywords = projectRes.data.keywords.sort((a, b) => {
          const rankA = rankingMap[a] !== undefined ? (rankingMap[a] === null ? Infinity : rankingMap[a]) : Infinity;
          const rankB = rankingMap[b] !== undefined ? (rankingMap[b] === null ? Infinity : rankingMap[b]) : Infinity;

          // Ascending order
          return rankA - rankB;
        });

        const sortedData = {
          ...projectRes.data,
          keywords: sortedKeywords,
          rankings: sortedRanking
        };
        // console.log(sortedData)
        // console.log(rankingMap)

        setProject(sortedData);

        // Fetch saved rankings if they exist
        const rankingsRes = await axios.get(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}/saved-rankings`, {
          headers: {
            "Content-Type": "application/json"
          },
          withCredentials: true
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
      const token = Cookies.get('userCookie');
      if (!token) {
        navigate('/admin');
        return;
      }

      // Send selected keywords to backend
      const res = await axios.post(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}/check-rankings`,
        { keywords: selectedKeywords },
        {
          headers: {
            "Content-Type": "application/json"
          },
          withCredentials: true
        }
      );

      setRankings(res.data);
      setProject({
        ...project,
        rankings: res.data
      })
      setRankingsLoading(false);
      setSelectAll(false);
      setSelectedKeywords([]);
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
    const csvHeader = ['Keyword', 'Ranking', 'Previous Ranking', 'Ranking URL', 'Last Checked'];

    // Create CSV data rows
    const csvData = project.keywords.map(keyword => {
      const rankingData = rankings.find(r => r.keyword === keyword) || {};

      return [
        keyword,
        rankingData.ranking ? `#${rankingData.ranking}` : (rankings.length > 0 ? 'Not in top 100' : '-'),
        rankingData.previousRanking || '-',
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

  const handleDelete = async () => {
    // Send selected keywords to backend
    const res = await axios.delete(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}`,
      {
        headers: {
          "Content-Type": "application/json"
        },
        withCredentials: true
      }
    );
    // Redirect to projects page after 2 seconds
    setTimeout(() => {
      navigate('/projects');
    }, 0);
  };

  const handleSort = () => {
    setSortOrder(!sortOrder)
    console.log(project)
    const rankingArr = project.rankings.sort((a, b) => {
      if (a.ranking === null) return 1;
      if (b.ranking === null) return -1;
      return b.ranking - a.ranking;
    })

    const rankingMap = rankingArr.reduce((acc, { keyword, ranking }) => {
      acc[keyword] = ranking; // Store keyword -> ranking pair
      return acc;
    }, {});

    const sortedKeywords = project.keywords.sort((a, b) => {
      const rankA = rankingMap[a] !== undefined ? (rankingMap[a] === null ? Infinity : rankingMap[a]) : Infinity;
      const rankB = rankingMap[b] !== undefined ? (rankingMap[b] === null ? Infinity : rankingMap[b]) : Infinity;

      // Ascending order
      return sortOrder ? rankA - rankB : rankB - rankA;
    });
    console.log(rankingMap)
    console.log(sortedKeywords)

    setProject({
      ...project,
      keywords: sortedKeywords
    })
  }

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
          <button onClick={handleDelete} className="logout-button">
            Delete Project
          </button>
          <button onClick={handleEdit} className="edit-button">
            Edit Project
          </button>
          <button onClick={handleBack} className="back-button">
            Back to Projects
          </button>
        </div>
      </div>

      <div className="project-detail-content">
        <div className="detail-section project-info">
          <div>
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
          <div>
            <table>
              <thead>
                <tr>
                  <th>Keyword Rank</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1-10</td>
                  <td>{project.rankings.filter(item => item.ranking < 11 && item.ranking > 0).length}</td>
                </tr>
                <tr>
                  <td>11-20</td>
                  <td>{project.rankings.filter(item => item.ranking < 21 && item.ranking > 10).length}</td>
                </tr>
                <tr>
                  <td>21-50</td>
                  <td>{project.rankings.filter(item => item.ranking < 51 && item.ranking > 20).length}</td>
                </tr>
                <tr>
                  <td>51-100</td>
                  <td>{project.rankings.filter(item => item.ranking <= 100 && item.ranking > 50).length}</td>
                </tr>
                <tr>
                  <td>Not in 100</td>
                  <td>{project.rankings.filter(item => item.ranking === null).length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="detail-section">
          <div className="section-header">
            <div className='pdpDetailTabberHeaderWrapper'>
              <ul>
                <li className={tabberState === 'keywords' ? 'active' : ''} onClick={() => setTabberState('keywords')}>Keywords ({project.keywords.length})</li>
                <li className={tabberState === 'queries' ? 'active' : ''} onClick={() => setTabberState('queries')}>Console</li>
              </ul>
            </div>
          </div>

          {rankingsError && (
            <div className="error-message">
              {rankingsError}
            </div>
          )}

          {tabberState === 'keywords' && (
            <div className="rankings-actions" style={{justifyContent: 'space-between'}}>
              <div className="selected-count">
                {selectedKeywords.length} of {project.keywords.length} selected
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          )}

          {rankingsLoading ? (
            <div className="loading">Fetching keyword rankings...</div>
          ) : (
            <>
              {project.keywords.length > 0 && tabberState === "keywords" ? (
                <div className="keywords-table-container">
                  <table className="keywords-table">
                    <thead>
                      <tr>
                        <th>S No.</th>
                        <th>
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            disabled={rankingsLoading}
                          />
                          Keyword
                        </th>
                        <th onClick={() => handleSort(true)} style={{ cursor: 'pointer' }}>Ranking
                          <span style={{ float: 'right', marginRight: '-10px', marginTop: '2px' }}>
                            <svg style={sortOrder ? { transform: 'rotate(180deg)' } : { transform: 'rotate(0)' }} xmlns="http://www.w3.org/2000/svg" fill="#000000" width="12px" height="12px" viewBox="0 0 24 24" stroke="#000000">
                              <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                              <g id="SVGRepo_iconCarrier">
                                <path d="M11.178 19.569a.998.998 0 0 0 1.644 0l9-13A.999.999 0 0 0 21 5H3a1.002 1.002 0 0 0-.822 1.569l9 13z" />
                              </g>
                            </svg>
                          </span>
                        </th>
                        <th style={{ minWidth: '160px' }}>Previous Ranking</th>
                        <th>Ranking URL</th>
                        <th>Last Checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.keywords.map((keyword, index) => {
                        const rankingData = rankings.find(r => r.keyword === keyword) || {};
                        const rankColorStatus = rankingData.ranking === null ? { color: '#000' } : rankingData.ranking == rankingData.previousRanking ? { color: '#000' } : rankingData.ranking > rankingData.previousRanking ? { color: '#f44336' } : { color: '#4caf50' };

                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedKeywords.includes(keyword) || selectAll}
                                onChange={() => handleKeywordSelect(keyword)}
                                disabled={rankingsLoading}
                              />
                              {keyword}
                            </td>
                            <td className={rankingData.ranking ? 'ranking-value' : ''} style={{ ...rankColorStatus, minWidth: '110px' }}>
                              {rankingData.ranking === null ? 'Not in 100' : rankingData.ranking === undefined ? '-' : rankingData.ranking}
                            </td>
                            <td className={rankingData.previousRanking ? 'prev-ranking-value' : ''}>
                              {rankingData.previousRanking === null ? 'Not in 100' : rankingData.previousRanking === undefined ? '-' : rankingData.previousRanking}
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
              ) : project.keywords.length === 0 && tabberState === "keywords" ? (
                <p className="no-keywords">No keywords added for this project.</p>
              ) : tabberState === "queries" ? (<QueryTable site={project.websiteUrl} />) : (
                <p className="no-keywords">No Query available.</p>
              )}

              {rankings.length > 0 && tabberState === "keywords" && (
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