const { googlesheets } = require('./index.js');
const Project = require('../../models/projects/projectModel.js')

// Helper: Convert 0-based column index to Excel-style column letter (A, B, ..., Z, AA, AB, etc)
function numToCol(n) {
    let s = '';
    while (n >= 0) {
        s = String.fromCharCode((n % 26) + 65) + s;
        n = Math.floor(n / 26) - 1;
    }
    return s;
}

// helper to get date in existing format
function getCurrentDate() {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
    return formattedDate;
}

async function updateSpreadsheet(projectId) {
    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }

        const spreadsheetId = project.spreadsheet.spreadsheetId;
        const sheetName = project.spreadsheet.sheets[0].tabName;
        const sheetId = project.spreadsheet.sheets[0].sheetId;
        const headerRow = 6;
        const startDataRow = 7;
        const rankingDate = getCurrentDate();


        // 1. Read the header row to find how many columns exist
        const getHeaderRes = await googlesheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!${headerRow}:${headerRow}`
        });
        const headers = getHeaderRes.data.values[0] || [];
        const nextColIndex = headers.length;
        const nextColLetter = numToCol(nextColIndex);

        // ---- 2) Read the Keywords from column A (starting row 7) ----
        const keywordRes = await googlesheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A${startDataRow}:A`,
            majorDimension: 'COLUMNS', // so values[0] is the entire column A (trimmed)
        });

        const sheetKeywords = keywordRes.data.values[0];
        const projectRankings = project.rankings;

        // Build a quick lookup map
        const rankingMap = new Map(
            projectRankings.map(r => [r.keyword.trim().toLowerCase(), r.ranking ?? 'Not in Top 100'])
        );

        // Create new array in sheet order
        const orderedRankings = sheetKeywords.map(kw => {
            const key = kw.trim().toLowerCase();
            return rankingMap.has(key) ? rankingMap.get(key) : 'Not in Top 100';
        });

        const rankingsArray = orderedRankings;

        // 2. Insert a new column at the end (if not already there)
        await googlesheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        insertDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'COLUMNS',
                                startIndex: nextColIndex,
                                endIndex: nextColIndex + 1,
                            },
                            inheritFromBefore: true
                        }
                    }
                ]
            }
        });

        // 3. Write the header (date)
        await googlesheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!${nextColLetter}${headerRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[rankingDate]] }
        });

        // 4. Write the rankings for each keyword
        const rankingValues = rankingsArray.map(val => [val]);
        let response = await googlesheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!${nextColLetter}${startDataRow}:${nextColLetter}${startDataRow + rankingsArray.length - 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rankingValues }
        });

        return response;

    } catch (error) {
        console.error('Sheets API error:', error.response?.data || error);
        throw error;
    }

}

module.exports = updateSpreadsheet;