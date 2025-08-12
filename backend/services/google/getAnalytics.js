const { searchconsole } = require('./index.js');
const Project = require('../../models/projects/projectModel.js');

const getAnalytics = async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
 
  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  try {
    const analyticsData = await searchconsole.searchanalytics.query({
      siteUrl: project.websiteUrl,
      requestBody: {
        startDate: payload.startDate,
        endDate: payload.endDate,
        dimensions: ["page","query"],
        rowLimit: 50,
        startRow: (payload.pageNo - 1) * 50
      },
    });
    if (!analyticsData.data.rows || analyticsData.data.rows.length === 0) {
      return res.status(404).json({ message: 'No analytics data found for this project' });
    }
    res.status(200).send(analyticsData.data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
}

module.exports = { getAnalytics }; 