import Groq from 'groq-sdk';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || !groqApiKey.startsWith('gsk_')) {
    return res.status(503).json({ error: 'GROQ_API_KEY is not configured on deployment.' });
  }

  const { text, url } = req.body || {};
  if (!text && !url) {
    return res.status(400).json({ error: 'No text or URL provided for extraction' });
  }

  try {
    let contentToAnalyze = text || '';
    if (url) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      if (!response.ok) {
        throw new Error(`Could not fetch URL (${response.status})`);
      }
      const html = await response.text();
      contentToAnalyze = cleanHtmlContent(html);
    }

    const sanitizedText = sanitizePII(contentToAnalyze).substring(0, 25000);
    const groq = new Groq({ apiKey: groqApiKey });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a recruiting assistant. Extract job referral details as JSON.
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
        { role: 'user', content: sanitizedText },
      ],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    });

    const rawContent = chatCompletion.choices[0].message.content || '{}';
    const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanContent);
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
