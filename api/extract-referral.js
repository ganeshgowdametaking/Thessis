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

const extractMetaContent = (html = '', key = '') => {
  if (!html || !key) return '';
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(regex);
  return m?.[1]?.trim() || '';
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

const inferJobType = (title = '', text = '', rawType = '') => {
  const source = `${rawType} ${title} ${text}`.toLowerCase();
  if (source.includes('intern')) return 'Internship';
  if (source.includes('part-time') || source.includes('part time')) return 'Part-time';
  if (source.includes('freelance')) return 'Freelance';
  if (/employment\s*type\s*:\s*contract|job\s*type\s*:\s*contract|contract\s*(role|position)/i.test(source)) return 'Contract';
  return 'Full-time';
};

const decodeHtmlEntities = (input = '') =>
  input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#43;/gi, '+')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));

const htmlToStructuredText = (html = '') => {
  if (!html) return '';
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/(h1|h2|h3|h4|h5|h6)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  text = decodeHtmlEntities(text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Drop application form and trailing portal noise.
  const noiseMarkers = ['Apply for this job', 'Create a Job Alert', 'Voluntary Self-Identification', 'Legal Entity'];
  for (const marker of noiseMarkers) {
    const idx = text.indexOf(marker);
    if (idx > 1000) {
      text = text.slice(0, idx).trim();
      break;
    }
  }
  return text;
};

const extractKnownSkills = (text = '') => {
  const skillTerms = [
    'SQL', 'Python', 'R', 'dbt', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Spark', 'Hadoop', 'BigQuery',
    'Tableau', 'Power BI', 'Matplotlib', 'Seaborn', 'PostgreSQL', 'React', 'Node.js', 'AWS', 'GCP', 'Azure',
    'Supabase', 'Figma', 'SwiftUI', 'React Native', 'A/B Testing', 'Data Wrangling', 'Statistics',
  ];
  const found = [];
  const low = text.toLowerCase();
  for (const skill of skillTerms) {
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(low)) found.push(skill);
  }
  return [...new Set(found)];
};

const hasMeaningfulDescription = (text = '') => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length < 220) return false;
  const low = clean.toLowerCase();
  const badMarkers = [
    'the full job description is provided in the source text',
    'job description is provided in the source text',
    'full content not available',
    'description not available',
  ];
  return !badMarkers.some((marker) => low.includes(marker));
};

const parseJsonLoose = (raw = '') => {
  if (!raw) return null;
  const attempts = [
    raw.trim(),
    raw.trim().replace(/;\s*$/, ''),
    raw.trim().replace(/[\u0000-\u001F]+/g, ' '),
  ];
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next normalized candidate.
    }
  }
  return null;
};

const collectJobPostingObjects = (node, out, depth = 0) => {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) {
    for (const item of node) collectJobPostingObjects(item, out, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;

  const typeValue = node['@type'] || node.type || '';
  const types = Array.isArray(typeValue) ? typeValue : [typeValue];
  if (types.some((t) => String(t || '').toLowerCase() === 'jobposting')) {
    out.push(node);
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      collectJobPostingObjects(value, out, depth + 1);
    }
  }
};

const normalizeEmploymentType = (employmentType) => {
  const values = Array.isArray(employmentType) ? employmentType : [employmentType];
  const normalized = values.map((v) => String(v || '').toUpperCase()).filter(Boolean);
  if (normalized.some((v) => v.includes('INTERN'))) return 'Internship';
  if (normalized.some((v) => v.includes('PART_TIME'))) return 'Part-time';
  if (normalized.some((v) => v.includes('CONTRACT'))) return 'Contract';
  if (normalized.some((v) => v.includes('TEMP'))) return 'Contract';
  if (normalized.some((v) => v.includes('FULL_TIME'))) return 'Full-time';
  return '';
};

const formatPostalAddress = (address = {}) => {
  if (!address || typeof address !== 'object') return '';
  const locality = address.addressLocality || '';
  const region = address.addressRegion || '';
  const country = address.addressCountry || '';
  const compact = [locality, region, country].filter(Boolean).join(', ');
  if (compact) return compact;
  return [address.streetAddress, locality, region, address.postalCode, country].filter(Boolean).join(', ');
};

const extractLocationFromJobPosting = (jobPosting = {}) => {
  const locationType = String(jobPosting?.jobLocationType || '').toUpperCase();
  if (locationType.includes('TELECOMMUTE')) return 'Remote';

  const candidate = Array.isArray(jobPosting?.jobLocation) ? jobPosting.jobLocation[0] : jobPosting?.jobLocation;
  if (typeof candidate === 'string') return candidate;
  if (candidate && typeof candidate === 'object') {
    if (typeof candidate.name === 'string' && candidate.name.trim()) return candidate.name.trim();
    const fromAddress = formatPostalAddress(candidate.address);
    if (fromAddress) return fromAddress;
  }

  const applicantReq = Array.isArray(jobPosting?.applicantLocationRequirements)
    ? jobPosting.applicantLocationRequirements[0]
    : jobPosting?.applicantLocationRequirements;
  if (typeof applicantReq === 'string') return applicantReq;
  if (applicantReq && typeof applicantReq === 'object') {
    const fromAddress = formatPostalAddress(applicantReq.address);
    if (fromAddress) return fromAddress;
    if (typeof applicantReq.name === 'string' && applicantReq.name.trim()) return applicantReq.name.trim();
  }

  return '';
};

const toArrayFromString = (value = '') =>
  String(value || '')
    .split(/,|\||;/)
    .map((v) => v.trim())
    .filter(Boolean);

const extractJsonLdJobPostingData = (rawHtml = '') => {
  if (!rawHtml) return null;
  const blocks = [...rawHtml.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => (m[1] || '').trim())
    .filter(Boolean);
  if (!blocks.length) return null;

  const postings = [];
  for (const block of blocks) {
    const parsed = parseJsonLoose(block);
    if (!parsed) continue;
    collectJobPostingObjects(parsed, postings);
  }
  if (!postings.length) return null;

  const scored = postings
    .map((p) => ({
      posting: p,
      score:
        (p?.title ? 2 : 0) +
        (p?.description ? 4 : 0) +
        (p?.hiringOrganization?.name ? 1 : 0) +
        (p?.jobLocation ? 1 : 0) +
        (p?.employmentType ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);
  const jobPosting = scored[0]?.posting;
  if (!jobPosting) return null;

  const title = String(jobPosting?.title || jobPosting?.name || '').trim();
  const company = String(jobPosting?.hiringOrganization?.name || '').trim();
  const descriptionRaw = String(jobPosting?.description || '').trim();
  const descriptionHtml = decodeHtmlEntities(descriptionRaw);
  const description = htmlToStructuredText(descriptionHtml);
  if (!title || !description) return null;

  const occupation = String(jobPosting?.occupationalCategory || '').trim();
  const employmentType = normalizeEmploymentType(jobPosting?.employmentType);
  const benefitsRaw = jobPosting?.jobBenefits;
  const benefits = Array.isArray(benefitsRaw)
    ? benefitsRaw.map((b) => String(b || '').trim()).filter(Boolean)
    : benefitsRaw
      ? toArrayFromString(benefitsRaw)
      : [];
  const qualificationText = [
    typeof jobPosting?.qualifications === 'string' ? jobPosting.qualifications : '',
    typeof jobPosting?.skills === 'string' ? jobPosting.skills : '',
    typeof jobPosting?.experienceRequirements === 'string' ? jobPosting.experienceRequirements : '',
  ]
    .filter(Boolean)
    .join('\n');
  const fullTextForSignals = `${description}\n${qualificationText}`.trim();

  return {
    job_title: title,
    company_name: company,
    department: occupation || inferDepartment(title, fullTextForSignals),
    location: extractLocationFromJobPosting(jobPosting),
    job_type: employmentType || inferJobType(title, fullTextForSignals, ''),
    experience_level: inferExperienceLevel(fullTextForSignals),
    skills: extractKnownSkills(fullTextForSignals),
    benefits,
    full_content_body: description,
  };
};

const extractWindowInitialState = (html = '') => {
  const marker = 'window.__INITIAL_STATE__';
  const idx = html.indexOf(marker);
  if (idx < 0) return null;

  const eqIdx = html.indexOf('=', idx);
  if (eqIdx < 0) return null;
  const start = html.indexOf('{', eqIdx);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, i + 1);
      }
    }
  }
  return null;
};

const extractGreenhouseData = (rawHtml = '', fallbackText = '') => {
  if (!rawHtml) return null;
  const titleFromMeta = extractTitleFromHtml(rawHtml).trim();
  const pageTitleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = decodeHtmlEntities(pageTitleMatch?.[1] || '').replace(/\s+/g, ' ').trim();
  const companyFromPageTitle = pageTitle.match(/\sat\s(.+)$/i)?.[1]?.trim() || '';
  const locationFromMeta = extractMetaContent(rawHtml, 'og:description');

  let jobTitle = '';
  let companyName = '';
  let location = '';
  let fullHtml = '';
  let employmentRaw = '';

  const stateJson = extractWindowInitialState(rawHtml);
  if (stateJson) {
    try {
      const state = JSON.parse(stateJson);
      const routeData = state?.loaderData?.['routes/$url_token_.jobs_.$job_post_id'] || {};
      const jobPost = routeData?.jobPost || {};
      jobTitle = jobPost.title || '';
      companyName = jobPost.company_name || '';
      employmentRaw = jobPost.employment || '';
      location =
        jobPost.location_name ||
        jobPost.job_post_location ||
        routeData.location ||
        routeData.job_post_location ||
        '';
      fullHtml = [jobPost.introduction, jobPost.content, jobPost.conclusion].filter(Boolean).join('\n');
    } catch {
      // Continue with HTML parsing fallback below.
    }
  }

  // Deterministic HTML parsing fallback if JSON state is unavailable.
  if (!jobTitle) {
    const h1Match = rawHtml.match(/<h1[^>]*class="[^"]*section-header[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
    jobTitle = decodeHtmlEntities(h1Match?.[1] || titleFromMeta).replace(/\s+/g, ' ').trim();
  }
  if (!companyName) {
    companyName = companyFromPageTitle || extractCompanyHint(rawHtml, fallbackText) || '';
  }
  if (!location) {
    const locMatch = rawHtml.match(/class="job__location"[\s\S]*?<div>([\s\S]*?)<\/div>/i);
    location = decodeHtmlEntities(locMatch?.[1] || locationFromMeta || '').replace(/\s+/g, ' ').trim();
  }
  if (!fullHtml) {
    const descStart = rawHtml.search(/class="job__description[^"]*"/i);
    if (descStart >= 0) {
      const startTagEnd = rawHtml.indexOf('>', descStart);
      const endCandidates = [
        rawHtml.search(/class="job-alert/i),
        rawHtml.search(/class="divider"/i),
        rawHtml.search(/class="application--container"/i),
      ].filter((i) => i > startTagEnd);
      const descEnd = endCandidates.length > 0 ? Math.min(...endCandidates) : rawHtml.length;
      fullHtml = rawHtml.slice(startTagEnd + 1, descEnd);
    }
  }

  const fullText = htmlToStructuredText(fullHtml);
  if (!jobTitle || !fullText) return null;

  return {
    job_title: jobTitle,
    company_name: companyName,
    department: inferDepartment(jobTitle, fullText),
    location,
    job_type: inferJobType(jobTitle, fullText, employmentRaw),
    experience_level: inferExperienceLevel(fullText),
    skills: extractKnownSkills(fullText),
    benefits: [],
    full_content_body: fullText,
  };
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
  const hasGroqKey = Boolean(groqApiKey && groqApiKey.startsWith('gsk_'));

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
    let deterministicData = null;
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

      // Deterministic ATS parser first (higher precision than LLM for supported domains).
      if (/greenhouse\.io/i.test(url)) {
        const greenhouseData = extractGreenhouseData(rawHtml, contentToAnalyze);
        if (greenhouseData?.job_title && greenhouseData?.full_content_body) {
          greenhouseData.description = greenhouseData.full_content_body;
          return res.status(200).json(greenhouseData);
        }
      }

      // Universal structured fallback: many career sites expose JSON-LD JobPosting.
      const jsonLdData = extractJsonLdJobPostingData(rawHtml);
      if (jsonLdData?.job_title) {
        deterministicData = jsonLdData;
        if (hasMeaningfulDescription(jsonLdData.full_content_body)) {
          jsonLdData.description = jsonLdData.full_content_body;
          return res.status(200).json(jsonLdData);
        }
      }

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
    if (!hasGroqKey) {
      const fallbackSource = buildStructuredExcerpt(sanitizedText, 10000);
      const fallbackData = {
        job_title: deterministicData?.job_title || titleHint || '',
        company_name: deterministicData?.company_name || inferCompanyFromText(sanitizedText) || companyHint || '',
        department: deterministicData?.department || inferDepartment(titleHint, sanitizedText),
        location: deterministicData?.location || '',
        job_type: deterministicData?.job_type || inferJobType(titleHint, sanitizedText, ''),
        experience_level: deterministicData?.experience_level || inferExperienceLevel(sanitizedText),
        skills: deterministicData?.skills?.length ? deterministicData.skills : extractKnownSkills(sanitizedText),
        benefits: deterministicData?.benefits || [],
        full_content_body: deterministicData?.full_content_body || fallbackSource || sanitizedText.slice(0, 8000),
      };
      fallbackData.description = fallbackData.full_content_body;
      return res.status(200).json(fallbackData);
    }

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
          job_title: deterministicData?.job_title || titleHint || '',
          company_name: deterministicData?.company_name || companyHint || '',
          department: deterministicData?.department || inferDepartment(titleHint, sanitizedText),
          location: deterministicData?.location || '',
          job_type: deterministicData?.job_type || '',
          experience_level: deterministicData?.experience_level || inferExperienceLevel(sanitizedText),
          skills: deterministicData?.skills || [],
          benefits: deterministicData?.benefits || [],
          full_content_body: deterministicData?.full_content_body || fallbackSource || sanitizedText.slice(0, 8000),
        };
      }
    }
    if (!data.job_title && titleHint) data.job_title = titleHint;
    if (!data.company_name && companyHint) data.company_name = companyHint;
    const inferredCompany = inferCompanyFromText(sanitizedText);
    if (
      inferredCompany &&
      (!data.company_name ||
        ['turbohire', 'linkedin', 'naukri', 'indeed', 'greenhouse', 'phenompeople'].includes(String(data.company_name).toLowerCase()))
    ) {
      data.company_name = inferredCompany;
    }
    if (!data.job_title && deterministicData?.job_title) data.job_title = deterministicData.job_title;
    if (!data.company_name && deterministicData?.company_name) data.company_name = deterministicData.company_name;
    if (!data.location && deterministicData?.location) data.location = deterministicData.location;
    if (!data.department && deterministicData?.department) data.department = deterministicData.department;
    if (!data.job_type && deterministicData?.job_type) data.job_type = deterministicData.job_type;
    if (!data.experience_level && deterministicData?.experience_level) data.experience_level = deterministicData.experience_level;
    if ((!Array.isArray(data.skills) || data.skills.length === 0) && deterministicData?.skills?.length) {
      data.skills = deterministicData.skills;
    }
    const currentDescription = data.full_content_body || data.description || '';
    if (!hasMeaningfulDescription(currentDescription)) {
      data.full_content_body =
        deterministicData?.full_content_body ||
        buildStructuredExcerpt(sanitizedText, 10000) ||
        sanitizedText.slice(0, 8000);
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
