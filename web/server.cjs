require('dotenv').config();
const express = require('express');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const cors = require('cors');
const cheerio = require('cheerio');
const Groq = require('groq-sdk');
const axios = require('axios');
const multer = require('multer');

const app = express();
const port = 3001;
const upload = multer({ storage: multer.memoryStorage() });
const rankingApiBase = (process.env.RANKING_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const debugLogsEnabled = process.env.DEBUG_LOGS === '1' || process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
  if (debugLogsEnabled) console.log(...args);
};
const securityLogWebhookUrl = process.env.SECURITY_LOG_WEBHOOK_URL || '';
const allowedCorsOrigins = (process.env.CORS_ALLOW_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const vercelPreviewRegex = /^https:\/\/.*\.vercel\.app$/i;
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://tanktide.com', 'https://www.tanktide.com'];
const corsOrigins = allowedCorsOrigins.length > 0 ? allowedCorsOrigins : defaultOrigins;
const s3ServerSideEncryption = process.env.S3_SERVER_SIDE_ENCRYPTION || 'AES256';
const s3KmsKeyId = process.env.S3_KMS_KEY_ID;

const emitSecurityEvent = async (event) => {
  const safeEvent = {
    ...event,
    service: 'thessis-web-api',
    timestamp: new Date().toISOString(),
  };
  console.warn('[SECURITY_EVENT]', JSON.stringify(safeEvent));
  if (!securityLogWebhookUrl) return;

  try {
    await fetch(securityLogWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeEvent),
    });
  } catch {
    // Keep request path non-blocking on logging failures.
  }
};

// Groq client initialization


const groqApiKey = process.env.GROQ_API_KEY;
console.log('🔑 Groq API Key found:', groqApiKey ? 'Yes' : 'No');

const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

if (!groq) {
  console.warn('⚠️  WARNING: GROQ_API_KEY is not set in web/.env. AI extraction will not work.');
}

// Simple async queue to handle rate limits
class ExtractionQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;

    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      this.process();
    }
  }
}

const extractionQueue = new ExtractionQueue();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin denied'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use((req, res, next) => {
  const sensitivePath = /^\/(auth|admin)(\/|$)/i.test(req.path || '');
  if (!sensitivePath) return next();

  const started = Date.now();
  res.on('finish', () => {
    emitSecurityEvent({
      category: 'AUTH_ADMIN_ATTEMPT',
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
      user_agent: req.headers['user-agent'] || '',
      status_code: res.statusCode,
      latency_ms: Date.now() - started,
    });
  });
  next();
});

// Middleware to sanitize PII (basic implementation)
const sanitizePII = (text) => {
  if (!text) return '';
  // Remove potential emails and phone numbers for privacy
  return text
    .replace(/[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+/gi, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
};

const formatLocationLabel = (item) => {
  const address = item?.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    '';
  const state = address.state || address.region || '';
  const country = address.country || '';
  const compact = [city, state, country].filter(Boolean).join(', ');
  if (compact) return compact;

  const fallback = String(item?.display_name || '').split(',').slice(0, 3).join(',').trim();
  return fallback || String(item?.name || '').trim();
};

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Helper function for robust HTML cleaning
const cleanHtmlContent = (html) => {
  const $ = cheerio.load(html);

  // 1. Remove obvious noise
  $('script, style, noscript, nav, footer, header, iframe, svg, button, form').remove();
  $('[class*="nav"], [class*="menu"], [class*="footer"], [class*="header"], [id*="nav"], [id*="menu"]').remove();

  // 2. Select main content container if possible
  let $content = $('body');
  const mainSelector = 'main, article, [role="main"], #content, .content, #main, .main, .job-description, .description';
  const mainElement = $(mainSelector).first();
  if (mainElement.length > 0) {
    $content = mainElement;
  }

  // 3. Smart Block Handling (The Fix for "Wall of Text")
  // Append a newline to block-level elements before extracting text ensures separation.
  $content.find('br, div, p, li, h1, h2, h3, h4, h5, h6, section, tr').after('\n');

  // 4. Extract text
  let text = $content.text();

  // FIX: Semantic Cutoff to remove Application Form Data
  const cutoffMarkers = [
    /Apply for this job/i,
    /Apply now/i,
    /School\s*\*\s*Degree/i,  // Greenhouse specific
    /Demographic Information/i,
    /Attach Resume/i
  ];

  for (const marker of cutoffMarkers) {
    const match = text.match(marker);
    if (match && match.index > 100) { // Ensure we don't cut off too early by mistake
      debugLog(`✂️ Cutting off text at marker: ${marker}`);
      text = text.substring(0, match.index);
      break;
    }
  }

  // 5. Whitespace Normalization (The Fix for "Excessive Spacing")
  // Collapse multiple newlines into max two
  text = text.replace(/\n\s*\n/g, '\n\n');
  // Collapse multiple spaces into one
  text = text.replace(/[ \t]+/g, ' ').trim();

  return text;
};

// AI Extraction Endpoint
app.post('/extract-referral', async (req, res) => {
  debugLog('📥 Received extraction request');
  const { text, url } = req.body;

  if (!text && !url) {
    return res.status(400).json({ error: 'No text or URL provided for extraction' });
  }

  if (!groq) {
    return res.status(503).json({
      error: 'AI service is not configured. Please add GROQ_API_KEY to your web/.env file and restart the server.',
      code: 'MISSING_API_KEY'
    });
  }

  try {
    debugLog(`🤖 Starting AI extraction... (Type: ${url ? 'URL' : 'Text'})`);
    const result = await extractionQueue.add(async () => {
      let contentToAnalyze = text;

      if (url) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 8000
          });

          contentToAnalyze = cleanHtmlContent(response.data);

        } catch (err) {
          throw new Error('Could not fetch content from URL');
        }
      }

      const sanitizedText = sanitizePII(contentToAnalyze).substring(0, 25000); // 15k -> 25k chars for deep pages

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a professional recruiting assistant. Extract job referral details. 
            
            ### CRITICAL RULE 1: EXPERIENCE LEVEL MAPPING (STRICT)
            You must map experience to EXACTLY one of these strings based on this logic:
            
            1. "Lead / Manager": ONLY if the Job Title contains "Lead", "Manager", "Head", "Principal" OR the description explicitly requires "People Management" / "Team Leadership". 
               (Do NOT select this just because years are high, e.g., "8 years" individual contributor is "Senior").
            2. "Senior (5+ yrs)": If it is NOT a Manager role, but requires 5+ years (e.g., "4-8 years", "5-10 years", "Senior Engineer").
            3. "Mid Level (2-4 yrs)": 2-5 years experience.
            4. "Entry Level": 0-2 years experience.

            ### CRITICAL RULE 2: FULL DESCRIPTION
            For the "full_content_body" field, you must output the ENTIRE original job description text verbatim.
            - DO NOT summarize.
            - DO NOT say "See above".
            - Copy the full text exactly as given, preserving newlines and bullet points.

            ### RETURN JSON:
            {
              "job_title": "String",
              "company_name": "String",
              "department": "String (Infer if missing)",
              "location": "String",
              "job_type": "String (Full-time/Part-time/Contract)",
              "experience_level": "String (MUST match one of the exact options above)",
              "skills": ["String", "String"],
              "benefits": ["String", "String"],
              "full_content_body": "String (The complete, verbatim job description text)"
            }`
          },
          {
            role: 'user',
            content: sanitizedText
          }
        ],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 8000
      });

      const rawContent = chatCompletion.choices[0].message.content;
      debugLog('🤖 Raw AI Response:', rawContent.substring(0, 200) + '...');

      // Strip markdown code blocks if present
      const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();

      try {
        const data = JSON.parse(cleanContent);

        // Use the AI's full content if available. 
        // If not (null), FALLBACK to the raw sanitized text we scraped ourselves.
        data.description = data.full_content_body || sanitizedText || '';

        return data;
      } catch (parseError) {
        console.error('Failed to parse AI response:', cleanContent);
        throw new Error('AI returned invalid JSON');
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Location autocomplete proxy to avoid browser CORS/rate-limit issues.
app.get('/location-suggestions', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 10)) : 8;

  if (!q) {
    return res.json([]);
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'jsonv2',
        q,
        addressdetails: 1,
        limit,
      },
      headers: {
        'User-Agent': 'TankTide/1.0 (support@tanktide.com)',
        'Accept-Language': 'en',
      },
      timeout: 7000,
    });

    const payload = Array.isArray(response.data) ? response.data : [];
    const suggestions = payload
      .map((item) => {
        const label = formatLocationLabel(item);
        if (!label) return null;
        return {
          place_id: item.place_id || `${item.lat}-${item.lon}-${label}`,
          display_name: label,
          label,
          lat: item.lat || null,
          lon: item.lon || null,
          raw_display_name: item.display_name || null,
        };
      })
      .filter(Boolean);

    const deduped = suggestions.filter(
      (item, index, arr) => arr.findIndex((candidate) => candidate.display_name === item.display_name) === index
    );

    return res.json(deduped);
  } catch (error) {
    // Non-blocking failure for UI autocomplete.
    return res.json([]);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Remove redundant express.json() call here

// Generate pre-signed URL for upload
app.post('/generate-upload-url', async (req, res) => {
  const { key, contentType } = req.body;
  if (!key || !contentType) return res.status(400).json({ error: 'Missing key or contentType' });

  const putParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: s3ServerSideEncryption,
  };
  if (s3ServerSideEncryption === 'aws:kms' && s3KmsKeyId) {
    putParams.SSEKMSKeyId = s3KmsKeyId;
  }

  const command = new PutObjectCommand(putParams);

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

const forwardRankingResponse = async (upstreamRes, res) => {
  const text = await upstreamRes.text();
  res.status(upstreamRes.status);
  const contentType = upstreamRes.headers.get('content-type');
  if (contentType) {
    res.set('content-type', contentType);
  }
  res.send(text);
};

app.post('/ranking/jobs', upload.none(), async (req, res) => {
  try {
    const form = new FormData();
    form.append('title', req.body.title || '');
    form.append('description', req.body.description || '');

    const upstreamRes = await fetch(`${rankingApiBase}/jobs/`, {
      method: 'POST',
      body: form,
    });

    await forwardRankingResponse(upstreamRes, res);
  } catch (error) {
    res.status(502).json({ error: `Ranking service unreachable at ${rankingApiBase}` });
  }
});

app.post('/ranking/jobs/:jobId/applications', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing resume file' });
    }

    const form = new FormData();
    form.append('name', req.body.name || '');
    form.append('email', req.body.email || '');
    form.append('phone', req.body.phone || '');
    form.append('profile_text', req.body.profile_text || '');
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype || 'application/pdf' }), req.file.originalname || 'resume.pdf');

    const upstreamRes = await fetch(`${rankingApiBase}/jobs/${req.params.jobId}/applications/`, {
      method: 'POST',
      body: form,
    });

    await forwardRankingResponse(upstreamRes, res);
  } catch (error) {
    res.status(502).json({ error: `Ranking service unreachable at ${rankingApiBase}` });
  }
});

app.get('/ranking/jobs/:jobId/leaderboard', async (req, res) => {
  try {
    const upstreamRes = await fetch(`${rankingApiBase}/jobs/${req.params.jobId}/leaderboard`);
    await forwardRankingResponse(upstreamRes, res);
  } catch (error) {
    res.status(502).json({ error: `Ranking service unreachable at ${rankingApiBase}` });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
