import os
import re

import ranker

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None


def extract_clean_text(pdf_path):
    """Extracts and cleans text from a PDF file."""
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is not installed")

    try:
        doc = fitz.open(pdf_path)
        raw_text = ""
        for page in doc:
            raw_text += page.get_text("text")

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


def process_resume(pdf_path):
    text = extract_clean_text(pdf_path)
    if not text:
        return None

    sections = chunk_sections(text)

    vectors = {
        "full_resume_vector": ranker.encode_text(text),
        "skills_vector": ranker.encode_text(sections.get("skills", "")),
        "experience_vector": ranker.encode_text(sections.get("experience", "")),
    }

    metadata = {
        "filename": os.path.basename(pdf_path),
    }

    return {
        "metadata": metadata,
        "sections": sections,
        "vectors": vectors,
    }
