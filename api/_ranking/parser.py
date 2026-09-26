import re

import ranker

try:
    import pymupdf as fitz  # `fitz` is the deprecated import alias
except Exception:
    fitz = None


def extract_clean_text_from_bytes(pdf_bytes: bytes) -> str:
    """Extracts and cleans text from an in-memory PDF — resumes are scored
    straight from the bytes downloaded from Supabase Storage, no disk I/O
    (this runs as a stateless serverless function)."""
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is not installed")
    if len(pdf_bytes) > 5 * 1024 * 1024 or not pdf_bytes.startswith(b"%PDF-"):
        return ""

    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            if doc.is_encrypted or doc.page_count > 30:
                return ""
            raw_text = ""
            for page in doc:
                raw_text += page.get_text("text")
                if len(raw_text) > 200_000:
                    return ""

        clean_text = re.sub(r"\s+", " ", raw_text).strip()
        return clean_text
    except Exception:
        return ""


def chunk_sections(text):
    sections = {
        "summary": "",
        "experience": "",
        "skills": "",
        "education": "",
        "projects": "",
    }

    patterns = {
        "experience": r"(?:work\s+experience|professional\s+experience|employment\s+history|experience)",
        "skills": r"(?:technical\s+skills|skills|technologies|core\s+competencies)",
        "education": r"(?:education|academic\s+background|qualifications)",
        "projects": r"(?:projects|personal\s+projects|academic\s+projects)",
    }

    matches = []
    for section, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            matches.append((section, match.start()))

    matches.sort(key=lambda x: x[1])
    matches.append(("end", len(text)))

    if len(matches) == 1:
        sections["summary"] = text
        return sections

    if matches[0][1] > 0:
        sections["summary"] = text[: matches[0][1]].strip()

    for i in range(len(matches) - 1):
        current_section, start = matches[i]
        _, end = matches[i + 1]

        pattern = patterns.get(current_section)
        if pattern:
            m = re.search(pattern, text[start:], re.IGNORECASE)
            if m:
                start += m.end()

        sections[current_section] = text[start:end].strip()

    return sections


def process_resume(pdf_bytes: bytes):
    text = extract_clean_text_from_bytes(pdf_bytes)
    if not text:
        return None

    sections = chunk_sections(text)

    return {
        "sections": sections,
    }
