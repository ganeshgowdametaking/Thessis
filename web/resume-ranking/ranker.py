import json
import os
import re
from datetime import date
from typing import List, Optional, Set

import numpy as np
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from sklearn.metrics.pairwise import cosine_similarity

# Optional high-quality embedding model is disabled by default for local stability.
# Enable only when explicitly requested:
#   RANKER_USE_SENTENCE_TRANSFORMER=1
SentenceTransformer = None


# Optional high-quality embedding model. Falls back gracefully if unavailable.
_embedding_model = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is not None:
        return _embedding_model

    use_sentence_transformer = os.getenv("RANKER_USE_SENTENCE_TRANSFORMER", "0") == "1"
    if not use_sentence_transformer:
        _embedding_model = False
        return _embedding_model

    global SentenceTransformer
    if SentenceTransformer is None:
        try:
            from sentence_transformers import SentenceTransformer as _SentenceTransformer
            SentenceTransformer = _SentenceTransformer
        except Exception:
            SentenceTransformer = False

    if not SentenceTransformer:
        _embedding_model = False
        return _embedding_model

    try:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        _embedding_model = False
    return _embedding_model


def encode_text(text: str) -> List[float]:
    model = get_embedding_model()
    if model:
        return model.encode(text).tolist()

    # Fallback: deterministic hashed bag-of-words vector (384 dims)
    vec = np.zeros(384, dtype=float)
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", text.lower())
    for token in tokens:
        if token in ENGLISH_STOP_WORDS:
            continue
        idx = hash(token) % 384
        vec[idx] += 1.0

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


def load_candidates(filepath="output/candidates.json"):
    with open(filepath, "r") as f:
        return json.load(f)


def load_job_description(filepath="job_description.txt"):
    with open(filepath, "r") as f:
        return f.read()


def get_cosine_similarity(vec1, vec2):
    if vec1 is None or vec2 is None:
        return 0.0

    try:
        v1 = np.array(vec1, dtype=float)
        v2 = np.array(vec2, dtype=float)

        if v1.size == 0 or v2.size == 0:
            return 0.0

        if v1.ndim == 1:
            v1 = v1.reshape(1, -1)
        if v2.ndim == 1:
            v2 = v2.reshape(1, -1)

        # Ensure equal dims in fallback scenarios.
        if v1.shape[1] != v2.shape[1]:
            min_dim = min(v1.shape[1], v2.shape[1])
            v1 = v1[:, :min_dim]
            v2 = v2[:, :min_dim]

        return float(cosine_similarity(v1, v2)[0][0])
    except Exception:
        return 0.0


def extract_keywords(text: str) -> Set[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", text.lower())
    keywords = {t for t in tokens if t not in ENGLISH_STOP_WORDS and len(t) > 2}
    return keywords


def calculate_jaccard_similarity(set1, set2):
    if not set1 or not set2:
        return 0.0
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    return intersection / union if union > 0 else 0.0


def extract_years_experience(text):
    # Direct claims like "3+ years", "2 yrs"
    matches = re.findall(r"(\d+)\+?\s*(?:years?|yrs?)", text, re.IGNORECASE)
    numeric_claim = max(map(int, matches)) if matches else 0

    # Range-based estimate from work timelines, e.g. "Jan 2023 - Present"
    month_map = {
        "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
        "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
        "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
        "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
    }

    def _to_month_index(month_s, year_s):
        year = int(year_s)
        month = month_map.get(month_s.lower(), 1)
        return year * 12 + month

    now = date.today()
    present_idx = now.year * 12 + now.month

    range_patterns = [
        # Jan 2022 - Mar 2024 / Jan 2022 - Present
        r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+((?:19|20)\d{2})\s*[-–to]+\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+((?:19|20)\d{2})|(present|current|now))",
        # 2022 - 2024 / 2022 - Present
        r"((?:19|20)\d{2})\s*[-–to]+\s*(((?:19|20)\d{2})|(present|current|now))",
    ]

    total_months = 0

    for m in re.finditer(range_patterns[0], text, re.IGNORECASE):
        start_idx = _to_month_index(m.group(1), m.group(2))
        if m.group(5):
            end_idx = present_idx
        else:
            end_idx = _to_month_index(m.group(3), m.group(4))
        if end_idx > start_idx:
            total_months += min(end_idx - start_idx, 12 * 10)

    for m in re.finditer(range_patterns[1], text, re.IGNORECASE):
        start_year = int(m.group(1))
        if m.group(4):
            end_idx = present_idx
        else:
            end_idx = int(m.group(3)) * 12 + 12
        start_idx = start_year * 12 + 1
        if end_idx > start_idx:
            total_months += min(end_idx - start_idx, 12 * 10)

    timeline_years = min(20, round(total_months / 12))

    if numeric_claim or timeline_years:
        return max(numeric_claim, timeline_years)
    return 0


def check_seniority_penalty(jd_text, resume_text):
    jd_lower = jd_text.lower()
    resume_lower = resume_text.lower()

    if "senior" in jd_lower and ("junior" in resume_lower or "intern" in resume_lower):
        if "senior" not in resume_lower:
            return -0.2
    return 0.0


def calculate_heuristic_score(jd_text, resume_text, jd_exp_req=0):
    cand_exp = extract_years_experience(resume_text)
    if jd_exp_req == 0:
        jd_exp_req = extract_years_experience(jd_text)

    penalty = check_seniority_penalty(jd_text, resume_text)
    base = 0.5

    if jd_exp_req > 0 and cand_exp >= jd_exp_req:
        base += 0.1

    base += penalty

    if re.search(r"(management|lead|leadership)", jd_text, re.IGNORECASE):
        if re.search(r"(management|lead|leadership)", resume_text, re.IGNORECASE):
            base += 0.1

    return max(0.0, min(1.0, base))


def generate_rationale(score, overlaps, gaps, years_detected, years_required):
    if score >= 80:
        verdict = f"Strong Match ({score}%)."
        strength_prefix = "Excellent alignment in"
    elif score >= 50:
        verdict = f"Potential Match ({score}%)."
        strength_prefix = "Notable overlaps in"
    else:
        verdict = f"Low Match ({score}%)."
        strength_prefix = "Limited overlap in"

    if overlaps:
        top_overlaps = list(overlaps)[:3]
        strengths = f"{strength_prefix} key areas like {', '.join(top_overlaps)}."
    else:
        strengths = "No major skill overlaps detected."

    if years_required > 0:
        if years_detected >= years_required:
            exp_feedback = f"Experience: Meets/Exceeds requirement with {years_detected} years."
        else:
            exp_feedback = f"Experience: Slightly junior ({years_detected} yrs) vs target ({years_required} yrs)."
    else:
        exp_feedback = f"Experience: {years_detected} years detected."

    if gaps:
        critical_gaps = list(gaps)[:2]
        missing = f"Missing: Resume does not explicitly mention {', '.join(critical_gaps)}."
    else:
        missing = "Missing: No major skill gaps detected."

    return f"{verdict} {strengths} {exp_feedback} {missing}"
