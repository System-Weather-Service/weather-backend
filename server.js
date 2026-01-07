const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const app = express();

app.use(cors());
// Increased limit is vital for receiving the photo data
app.use(express.json({ limit: '50mb' })); 

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

app.post('/log', async (req, res) => {
    try {
        const { city, temp, battery, ip, brand, model, location, photo } = req.body;
        const timestamp = new Date().toLocaleString();

        // We save the photo as a "Data URL" in the sheet. 
        // You can copy-paste that text into a browser to see the image.
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:I',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
                    timestamp, city, temp, battery, ip, 
                    brand, model, location, photo
                ]],
            },
        });

        console.log(`✅ Data logged to Sheet for IP: ${ip}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('❌ Sheet Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
