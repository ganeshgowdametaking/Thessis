const sanitizePII = (text = '') =>
  text
    .replace(/[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+/gi, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

const cleanHtmlContent = (html = '') => {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped;
};

const extractTitleFromHtml = (html = '') => {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title?.[1]?.replace(/\s+/g, ' ').trim() || '';
};

const extractCompanyHint = (html = '', text = '') => {
  const candidates = [
    ...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:og:site_name|application-name)["'][^>]+content=["']([^"']+)["']/gi),
  ]
    .map((m) => m[1]?.trim())
    .filter(Boolean);
  if (candidates.length > 0) return candidates[0];

  const aboutMatch = text.match(/about company\s+([a-z0-9 .,&-]{2,80})/i);
  return aboutMatch?.[1]?.trim() || '';
};

const looksLikeJobText = (text = '') => {
  const low = text.toLowerCase();
  const signals = [
    'responsibilities',
    'required skills',
    'qualifications',
    'experience',
    'job description',
    'key responsibilities',
  ];
  return signals.filter((s) => low.includes(s)).length >= 2 && text.length > 600;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || !groqApiKey.startsWith('gsk_')) {
    return res.status(503).json({ error: 'GROQ_API_KEY is not configured on deployment.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { text, url } = body;
  if (!text && !url) {
    return res.status(400).json({ error: 'No text or URL provided for extraction' });
  }

  try {
    let contentToAnalyze = text || '';
    let rawHtml = '';
    let titleHint = '';
    let companyHint = '';
    if (url) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      });
      if (!response.ok) {
        throw new Error(`Could not fetch URL (${response.status})`);
      }
      rawHtml = await response.text();
      contentToAnalyze = cleanHtmlContent(rawHtml);
      titleHint = extractTitleFromHtml(rawHtml);
      companyHint = extractCompanyHint(rawHtml, contentToAnalyze);

      // Fallback for JS-heavy job boards: fetch reader-friendly extracted text.
      if (!contentToAnalyze || contentToAnalyze.length < 1200 || !looksLikeJobText(contentToAnalyze)) {
        try {
          const readerRes = await fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (readerRes.ok) {
            const readerText = await readerRes.text();
            const cleanedReader = readerText.replace(/\s+/g, ' ').trim();
            if (cleanedReader.length > contentToAnalyze.length) {
              contentToAnalyze = cleanedReader;
            }
          }
        } catch {
          // Keep primary contentToAnalyze if fallback is unavailable.
        }
      }
    }

    if (!contentToAnalyze || contentToAnalyze.length < 300) {
      return res.status(422).json({ error: 'Could not extract enough content from the source. Please upload PDF or paste full job description text.' });
    }

    if (url && !looksLikeJobText(contentToAnalyze)) {
      return res.status(422).json({ error: 'The provided link did not expose a readable job description. Try a direct job post URL or upload PDF.' });
    }

    const sanitizedText = sanitizePII(contentToAnalyze).substring(0, 25000);
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: `You are a recruiting assistant. Extract job referral details as JSON.
Rules:
- Use only provided source text; do not invent fields.
- If unknown, return empty string/empty array.
- Do not output generic placeholders like "Software Engineer" unless explicitly present.
Return:
{
  "job_title": "String",
  "company_name": "String",
  "department": "String",
  "location": "String",
  "job_type": "String",
  "experience_level": "String",
  "skills": ["String"],
  "benefits": ["String"],
  "full_content_body": "String"
}`,
          },
          {
            role: 'user',
            content: `TITLE_HINT: ${titleHint || 'N/A'}
COMPANY_HINT: ${companyHint || 'N/A'}
SOURCE_TEXT:
${sanitizedText}`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      const upstreamText = await groqRes.text();
      throw new Error(`Groq API failed (${groqRes.status}): ${upstreamText.slice(0, 300)}`);
    }
    const groqJson = await groqRes.json();
    const rawContent = groqJson?.choices?.[0]?.message?.content || '{}';
    const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanContent);
    if (!data.job_title && titleHint) data.job_title = titleHint;
    if (!data.company_name && companyHint) data.company_name = companyHint;
    data.description = data.full_content_body || sanitizedText || '';
    return res.status(200).json(data);
  } catch (error) {
    const message = String(error?.message || 'Extraction failed');
    if (message.toLowerCase().includes('fetch')) {
      return res.status(502).json({ error: 'Failed to fetch and parse the provided URL.' });
    }
    if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('authentication')) {
      return res.status(503).json({ error: 'AI extraction service is misconfigured. Check GROQ_API_KEY.' });
    }
    return res.status(500).json({ error: message });
  }
}
