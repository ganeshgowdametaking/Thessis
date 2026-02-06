require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const port = 3001;

const s3 = new S3Client({ region: process.env.AWS_REGION });

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179',
    'http://localhost:5180',
    'http://localhost:5181',
    'http://localhost:5182',
    'http://localhost:5183',
    'http://localhost:5184',
    'http://localhost:5185'
  ],
  credentials: true
}));

app.use(express.json());

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Upload file directly through backend (avoids CORS issues)
app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'No key provided' });
    }

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);

    // Return the S3 URL without query parameters
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    res.json({ url: s3Url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Generate pre-signed URL for upload (keeping for compatibility)
app.post('/generate-upload-url', async (req, res) => {
  const { key, contentType } = req.body;
  if (!key || !contentType) return res.status(400).json({ error: 'Missing key or contentType' });

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min
  res.json({ url });
});

// Generate pre-signed URL for download
app.post('/generate-download-url', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Missing key' });

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min
  res.json({ url });
});

// Send feedback email via Mailgun
app.post('/send-feedback', async (req, res) => {
  try {
    const { subject, message, userEmail, userName } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    const domain = process.env.MAILGUN_DOMAIN;
    const apiKey = process.env.MAILGUN_API_KEY;
    const fromEmail = process.env.MAILGUN_FROM_EMAIL || `TankTide Feedback <feedback@${domain}>`;

    if (!domain || !apiKey) {
      console.error('❌ Mailgun configuration missing');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const auth = Buffer.from(`api:${apiKey}`).toString('base64');

    const formData = new URLSearchParams();
    formData.append('from', fromEmail);
    formData.append('to', 'info@tanktide.com');
    formData.append('subject', `[TankTide Feedback] ${subject || 'New Feedback'}`);
    formData.append('text', `
New feedback received from TankTide User:
------------------------------------------
Name: ${userName || 'Anonymous'}
Email: ${userEmail || 'Not provided'}
Subject: ${subject || 'General'}
Time: ${new Date().toLocaleString()}

Feedback:
"${message}"
------------------------------------------
    `);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Mailgun error:', errorData);
      throw new Error(errorData.message || 'Failed to send email');
    }

    res.json({ success: true, message: 'Feedback sent successfully' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to send feedback' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 