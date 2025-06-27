require('dotenv').config();
const express = require('express');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const port = 3001;

const s3 = new S3Client({ region: process.env.AWS_REGION });

app.use(express.json());

// Generate pre-signed URL for upload
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 