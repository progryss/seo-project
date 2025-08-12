import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import QueryTable from '../components/queryTable';
import { Button, Chip, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';

function ProjectDetail() {

  const { id } = useParams();
  const navigate = useNavigate();

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

  const [isLinkSheetLoading, setIsLinkSheetLoading] = useState(false);
  const [isUpdateSheetRankingLoading, setUpdateSheetRankingLoading] = useState(false);

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

      setProject({
        ...project,
        rankings: res.data
      })

      setRankings(res.data);
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

  // delete project
  const handleDelete = async () => {

    let confirmDelete = window.confirm("Are you sure you want to delete this project? This action cannot be undone.");
    if (!confirmDelete) {
      return;
    }
    // Send selected keywords to backend
    await axios.delete(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}`,
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

    toast.success('Project deleted successfully!')
  };

  // shorting
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

  // link google sheet
  const linkSheetToProject = async () => {

    try {
      setIsLinkSheetLoading(true)
      const payload = {
        spreadsheetUrl: project.spreadsheet.spreadsheetUrl
      }
      const response = await axios.post(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}/link-sheet`, payload, {
        headers: {
          "Content-Type": "application/json"
        },
        withCredentials: true,
      });
      setProject(response.data.project);
      toast.success(response.data.message)
    } catch (error) {
      console.log('Error linking sheet:', error);
      toast.error('Error linking spreadsheet to project')
    } finally {
      setIsLinkSheetLoading(false)
    }
  }

  // update sheet ranking in google sheet
  const updateSheetRanking = async () => {
    try {
      setUpdateSheetRankingLoading(true)
      const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}/update-googlesheet`, {
        headers: {
          "Content-Type": "application/json"
        },
        withCredentials: true,
      });
      toast.success(response.data)
    } catch (error) {
      console.log(error)
      toast.error('Error in Updating Google Sheet')
    } finally {
      setUpdateSheetRankingLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/projects');
  };

  const handleEdit = () => {
    navigate(`/project/edit/${id}`);
  };

  useEffect(() => {
    fetchProjectAndRankings();
  }, [id, navigate]);

  // Set up selected keywords when project data is loaded
  useEffect(() => {
    if (project && project.keywords) {
      setSelectedKeywords([]);
      setSelectAll(false);
    }
  }, [project]);

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
        <div>
          <Button variant="contained" size='small' color="error" onClick={() => { handleDelete() }}>
            Delete Project
          </Button>
        </div>
        <div className="header-buttons">
          <Button variant="outlined" size='small' color="warning" onClick={() => { handleEdit() }}>
            Edit Project
          </Button>
          <Button variant="outlined" size='small' color="secondary" onClick={() => { handleBack() }}>
            Back to Projects
          </Button>
        </div>
      </div>

      <div className="project-detail-content">
        <div className="detail-section project-info">
          <div>
            <h2 style={{ marginBottom: '20px', color: '#000' }}>{project.websiteName}</h2>
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
              <span className="detail-label">Google Sheet:</span>
              <span className="detail-value">
                {project.spreadsheet.spreadsheetTitle ?
                  (
                    <>
                      <div style={{ display: 'flex', gap: '100px', alignItems: 'end' }}>
                        <p>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 64 88" height={23} style={{ position: 'relative', bottom: '-3px' }}>
                            <path
                              d="M 42,0 64,22 53,24 42,22 40,11 Z"
                              fill="#188038" />
                            <path
                              d="M 42,22 V 0 H 6 C 2.685,0 0,2.685 0,6 v 76 c 0,3.315 2.685,6 6,6 h 52 c 3.315,0 6,-2.685 6,-6 V 22 Z"
                              fill="#34a853" />
                            <path
                              d="M 12,34 V 63 H 52 V 34 Z M 29.5,58 H 17 v -7 h 12.5 z m 0,-12 H 17 V 39 H 29.5 Z M 47,58 H 34.5 V 51 H 47 Z M 47,46 H 34.5 V 39 H 47 Z"
                              fill="#fff" />
                          </svg>
                          <span style={{ marginLeft: '5px', textTransform: 'uppercase', fontWeight: '600' }}>{project.spreadsheet.spreadsheetTitle} - </span>
                          <span style={{ fontSize: '14px' }}>{project.spreadsheet.sheets[0].tabName}</span>
                        </p>
                        <Chip
                          variant='outlined'
                          label={
                            isUpdateSheetRankingLoading ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CircularProgress size={14} color="inherit" />
                                Updating...
                              </span>
                            ) : (
                              'Update Sheet Ranking'
                            )
                          }
                          size="small"
                          sx={{ width: '170px' }}
                          color="primary"
                          onClick={() => {
                            if (!isUpdateSheetRankingLoading) updateSheetRanking();
                          }}
                          clickable={!isUpdateSheetRankingLoading} // disables click during loading
                        />
                      </div>
                    </>
                  )
                  : !project.spreadsheet.spreadsheetTitle && project.spreadsheet.spreadsheetUrl != '' ?
                    (
                      <Chip
                        variant='outlined'
                        label={
                          isLinkSheetLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CircularProgress size={14} color="inherit" />
                              linking...
                            </span>
                          ) : (
                            'Link Your Sheet Here'
                          )
                        }
                        size="small"
                        sx={{ width: '170px' }}
                        color="primary"
                        onClick={() => {
                          if (!isLinkSheetLoading) linkSheetToProject();
                        }}
                        clickable={!isLinkSheetLoading} // disables click during loading
                      />
                    )
                    : <Chip variant='outlined' sx={{ cursor: 'not-allowed' }} label="URL Not Provided" size="small" color="secondary" />
                }
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created on:</span>
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
                <li className={tabberState === 'queries' ? 'active' : ''} onClick={() => setTabberState('queries')}>Search Console</li>
              </ul>
            </div>
          </div>

          {rankingsError && (
            <div className="error-message">
              {rankingsError}
            </div>
          )}

          {tabberState === 'keywords' && (
            <div className="rankings-actions" style={{ justifyContent: 'space-between' }}>
              <div className="selected-count" style={{ paddingLeft: '15px' }}>
                {selectedKeywords.length} of {project.keywords.length} selected
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!rankingsLoading && (
                  <>
                    <Button variant="contained" size='small' color="primary" onClick={() => { fetchKeywordRankings() }} disabled={rankingsLoading || selectedKeywords.length === 0}>
                      {rankings.length > 0 ? 'Refresh Rankings' : 'Check Rankings'}
                    </Button>
                    <Button variant="outlined" size='small' color="success" onClick={() => { exportToCSV() }} disabled={project.keywords.length === 0}>
                      Export CSV
                    </Button>
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
                        const rankColorStatus = rankingData.ranking === rankingData.previousRanking ? { color: '#555555' }
                          : (rankingData.ranking > rankingData.previousRanking && rankingData.previousRanking != null) ||
                            (rankingData.ranking === null && rankingData.previousRanking != null) ? { color: '#f44336' }
                            : { color: '#4caf50' };

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