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

const inferCompanyFromText = (text = '') => {
  const low = text.toLowerCase();
  const aboutIdx = low.indexOf('about company');
  if (aboutIdx >= 0) {
    const windowText = text.slice(aboutIdx, aboutIdx + 500);
    const match = windowText.match(/about company\s+([A-Z][A-Za-z0-9.&-]{1,40})(?:\s+(?:has|is|was|,|\.))/);
    if (match?.[1]) return match[1].trim();
  }
  const foundedMatch = text.match(/Founded in \d{4},\s*([A-Z][A-Za-z0-9.& -]{1,60})/i);
  if (foundedMatch?.[1]) {
    const raw = foundedMatch[1].trim();
    const cleaned = raw.replace(/\s+(has|is|was)\b.*$/i, '').trim();
    return cleaned;
  }
  return '';
};

const inferExperienceLevel = (text = '') => {
  const patterns = [
    /required experience[^0-9]{0,30}(\d+)\s*[-–to]{1,3}\s*(\d+)\s*years?/i,
    /experience[^0-9]{0,30}(\d+)\s*[-–to]{1,3}\s*(\d+)\s*years?/i,
    /(\d+)\s*[-–to]{1,3}\s*(\d+)\s*years?/i,
  ];
  const plus = text.match(/(?:required|experience)?[^0-9]{0,20}(\d+)\+?\s*years?/i);
  let years = 0;
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      years = Number(m[1]);
      break;
    }
  }
  if (!years && plus) years = Number(plus[1]);
  if (years >= 5) return 'Senior (5+ yrs)';
  if (years >= 2) return 'Mid Level (2-4 yrs)';
  return years > 0 ? 'Entry Level' : '';
};

const inferDepartment = (title = '', text = '') => {
  const source = `${title} ${text}`.toLowerCase();
  if (source.includes('data scientist') || source.includes('machine learning')) return 'Data Science';
  if (source.includes('backend') || source.includes('full stack') || source.includes('software engineer')) return 'Engineering';
  if (source.includes('product')) return 'Product';
  if (source.includes('design')) return 'Design';
  return '';
};

const buildStructuredExcerpt = (text = '', maxLen = 12000) => {
  const headings = [
    'Key Responsibilities',
    'Required Skills',
    'Preferred Qualifications',
    'Education',
    'Requirements',
    'Qualifications',
    'Job Description',
  ];
  let excerpt = '';
  for (const h of headings) {
    const m = text.match(new RegExp(`${h}[\\s\\S]{0,1800}`, 'i'));
    if (m?.[0]) excerpt += `\n\n${m[0]}`;
  }
  if (!excerpt) excerpt = text;
  return excerpt.slice(0, maxLen);
};

const callGroqExtraction = async (groqApiKey, promptSource, titleHint, companyHint, maxTokens = 1400) => {
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
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: `Extract job details as strict JSON only.
Rules:
- Use only source text.
- If unknown, return "" or [].
Return keys exactly:
job_title, company_name, department, location, job_type, experience_level, skills, benefits, full_content_body`,
        },
        {
          role: 'user',
          content: `TITLE_HINT: ${titleHint || 'N/A'}
COMPANY_HINT: ${companyHint || 'N/A'}
SOURCE_TEXT:
${promptSource}`,
        },
      ],
    }),
  });

  const upstreamText = await groqRes.text();
  if (!groqRes.ok) {
    throw new Error(`GROQ_UPSTREAM_${groqRes.status}:${upstreamText.slice(0, 500)}`);
  }
  const groqJson = JSON.parse(upstreamText);
  const rawContent = groqJson?.choices?.[0]?.message?.content || '{}';
  const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleanContent);
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
            const cleanedReader = readerText
              .replace(/\r/g, '')
              .replace(/[ \t]+/g, ' ')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
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
    let data;
    try {
      data = await callGroqExtraction(groqApiKey, sanitizedText.slice(0, 18000), titleHint, companyHint, 1600);
    } catch (primaryErr) {
      const fallbackSource = buildStructuredExcerpt(sanitizedText, 10000);
      try {
        data = await callGroqExtraction(groqApiKey, fallbackSource, titleHint, companyHint, 1200);
      } catch (_fallbackErr) {
        // Best-effort deterministic fallback to avoid hard failure for users.
        data = {
          job_title: titleHint || '',
          company_name: companyHint || '',
          department: inferDepartment(titleHint, sanitizedText),
          location: '',
          job_type: '',
          experience_level: inferExperienceLevel(sanitizedText),
          skills: [],
          benefits: [],
          full_content_body: fallbackSource || sanitizedText.slice(0, 8000),
        };
      }
    }
    if (!data.job_title && titleHint) data.job_title = titleHint;
    if (!data.company_name && companyHint) data.company_name = companyHint;
    const inferredCompany = inferCompanyFromText(sanitizedText);
    if (
      inferredCompany &&
      (!data.company_name ||
        ['turbohire', 'linkedin', 'naukri', 'indeed', 'greenhouse'].includes(String(data.company_name).toLowerCase()))
    ) {
      data.company_name = inferredCompany;
    }
    const inferredLevel = inferExperienceLevel(sanitizedText);
    if (inferredLevel) data.experience_level = inferredLevel;
    if (!data.department) {
      const inferredDepartment = inferDepartment(String(data.job_title || titleHint || ''), sanitizedText);
      if (inferredDepartment) data.department = inferredDepartment;
    }
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
