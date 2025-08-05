import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, TextField } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { toast } from 'react-toastify';


function QueryTable({ site }) {

    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [keyWordsData, setKeyWordsData] = React.useState([]);
    const [sortField, setSortField] = useState(null); // 'clicks' or 'impressions'
    const [sortOrder, setSortOrder] = useState('desc'); // or 'asc'

    const [loadingToastId, setLoadingToastId] = useState(null);

    // Default dates: last 30 days
    const today = new Date();

    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    const defaultStartDate = lastMonth.toISOString().slice(0, 10);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 1);
    const defaultEndDate = startDate.toISOString().slice(0, 10);

    const [dates, setDates] = useState({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
    });

    const [pageNo, setPageNo] = useState(1);

    async function fetchAnalytics() {
        try {

            const response = await axios.post(`${process.env.REACT_APP_SERVER_URL}/api/projects/${id}/analytics`, {
                ...dates,
                pageNo: pageNo
            }, {
                headers: {
                    "Content-Type": "application/json"
                },
                withCredentials: true
            });
            console.log('Analytics response:', response);
            setKeyWordsData(response.data.rows || []);
            setLoading(false);
        }
        catch (error) {
            console.error('Error fetching analytics:', error);
        }
    }

    useEffect(() => {
        if (site) {
            fetchAnalytics();
        }
    }, [site, pageNo]);

    const handleSort = (field) => {
        if (sortField === field) {
            // Toggle direction if already sorting by this field
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Start sorting by new field, default to descending
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const sortedData = React.useMemo(() => {
        if (!sortField) return keyWordsData;
        // Copy to avoid mutating state
        const sorted = [...keyWordsData].sort((a, b) => {
            const aValue = a[sortField] || 0;
            const bValue = b[sortField] || 0;
            return sortOrder === 'asc'
                ? aValue - bValue
                : bValue - aValue;
        });
        return sorted;
    }, [keyWordsData, sortField, sortOrder]);

    const fetchAnalyticsByCustomDate = async () => {
        pageNo === 1 ? setPageNo(1) : setPageNo(1);
        // Show loading toast and save its id
        const toastId = toast.loading("Loading Results ...");
        setLoadingToastId(toastId);
        setLoading(true);
        setDates({ ...dates, startDate: dates.startDate, endDate: dates.endDate });
        await fetchAnalytics();
        toast.dismiss(toastId);
        toast.success("Success!");
    }

    const exportToCSV = () => {
        if (!sortedData || sortedData.length === 0) {
            toast.error("No data to export.");
            return;
        }

        // CSV headers (same as your table columns)
        const csvHeader = [
            'Keyword Page Url',
            'Keyword',
            'Clicks',
            'Impressions'
        ];

        // Build CSV data rows
        const csvData = sortedData.map((row, index) => [
            row?.keys?.[0] || '-',
            row?.keys?.[1] || '-',
            row.clicks ?? '-',
            row.impressions ?? '-'
        ]);

        // Prepare CSV string (escape quotes/commas)
        const csvContent = [
            csvHeader.join(','),
            ...csvData.map(row =>
                row.map(cell => {
                    const val = cell !== undefined && cell !== null ? cell.toString() : '';
                    return val.includes(',') || val.includes('"') || val.includes('\n')
                        ? `"${val.replace(/"/g, '""')}"`
                        : val;
                }).join(',')
            )
        ].join('\n');

        // Download as file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `keywords_page${pageNo}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className='selected-count'>Showing Page {pageNo} Result : {pageNo * 50} of 500</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>From</span>
                    <TextField
                        required
                        margin="dense"
                        name="to"
                        type="date"
                        variant="standard"
                        InputLabelProps={{
                            shrink: true,
                        }}
                        value={dates.startDate}
                        onChange={(e) => {
                            setDates({
                                ...dates,
                                startDate: e.target.value
                            });
                        }}
                    />
                    <span>to</span>
                    <TextField
                        required
                        margin="dense"
                        name="to"
                        type="date"
                        variant="standard"
                        InputLabelProps={{
                            shrink: true,
                        }}
                        value={dates.endDate}
                        onChange={(e) => {
                            setDates({
                                ...dates,
                                endDate: e.target.value
                            });
                        }}
                    />
                    <Button variant="contained" color="primary" onClick={() => { fetchAnalyticsByCustomDate() }} >
                        Apply<TuneIcon sx={{ marginLeft: 1 }} />
                    </Button>
                    <Button variant="contained" color="success" onClick={() => { exportToCSV() }} >
                        Export CSV
                    </Button>
                </div>
            </div>
            {!loading && keyWordsData.length > 0 ? (
                <div className="keywords-table-container">
                    <table className="keywords-table">
                        <thead>
                            <tr>
                                <th>S No.</th>
                                <th>
                                    Keyword Page Url
                                </th>
                                <th>Keyword</th>
                                <th onClick={() => handleSort('clicks')} style={{ cursor: 'pointer', minWidth: '110px' }}>Click
                                    <span style={{ float: 'right', marginRight: '20px', marginTop: '2px' }}>
                                        <svg style={sortOrder === 'desc' && sortField === 'clicks' ? { transform: 'rotate(180deg)' } : { transform: 'rotate(0)' }} xmlns="http://www.w3.org/2000/svg" fill="#000000" width="12px" height="12px" viewBox="0 0 24 24" stroke="#000000">
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M11.178 19.569a.998.998 0 0 0 1.644 0l9-13A.999.999 0 0 0 21 5H3a1.002 1.002 0 0 0-.822 1.569l9 13z" />
                                            </g>
                                        </svg>
                                    </span>
                                </th>
                                <th onClick={() => handleSort('impressions')} style={{ cursor: 'pointer', minWidth: '130px' }}>Impression
                                    <span style={{ float: 'right', marginRight: '20px', marginTop: '2px' }}>
                                        <svg style={sortOrder === 'desc' && sortField === "impressions" ? { transform: 'rotate(180deg)' } : { transform: 'rotate(0)' }} xmlns="http://www.w3.org/2000/svg" fill="#000000" width="12px" height="12px" viewBox="0 0 24 24" stroke="#000000">
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M11.178 19.569a.998.998 0 0 0 1.644 0l9-13A.999.999 0 0 0 21 5H3a1.002 1.002 0 0 0-.822 1.569l9 13z" />
                                            </g>
                                        </svg>
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((keyword, index) => {
                                return (
                                    <tr key={index}>
                                        <td>{(pageNo - 1) * 50 + (index + 1)}</td>
                                        <td>
                                            {keyword?.keys?.length > 0 ? keyword.keys[0] : '-'}
                                        </td>
                                        <td>
                                            {keyword?.keys?.length > 0 ? keyword.keys[1] : '-'}
                                        </td>
                                        <td>
                                            {keyword.clicks ? keyword.clicks.toLocaleString() : '-'}
                                        </td>
                                        <td>
                                            {keyword.impressions ? keyword.impressions.toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>) : (
                <div className="loading">Loading Console details...</div>
            )}
            <div className='pagination-container'>
                <div className="pagination">
                    <button
                        className="pagination-button"
                        onClick={() => {
                            setLoading(true);
                            if (pageNo > 1) {
                                setPageNo(pageNo - 1);
                            }
                        }}
                        disabled={pageNo <= 1}
                    >
                        Previous
                    </button>
                    <span className="pagination-info">Page {pageNo}</span>
                    <button
                        className="pagination-button"
                        onClick={() => {
                            setLoading(true);
                            setPageNo(pageNo + 1);
                        }}
                    >
                        Next
                    </button>
                </div>
            </div>
        </>
    )
}

export default QueryTable;
