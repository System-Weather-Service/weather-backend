const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Google Sheets Setup
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// 2. The Route to save weather
app.post('/log', async (req, res) => {
    try {
        const { city, temperature, humidity, condition } = req.body;
        const date = new Date().toLocaleString();

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:E',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[date, city, temperature, humidity, condition]],
            },
        });

        console.log(`✅ Success: Data logged for ${city}`);
        res.status(200).json({ message: 'Success: Data logged!' });
    } catch (error) {
        console.error('❌ Error logging to Google Sheets:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Simple Home Route
app.get('/', (req, res) => {
    res.send('Weather Backend is Running!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
