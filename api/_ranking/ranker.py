import os
import re
from datetime import date
from typing import List, Optional, Set

import numpy as np

# Small, fixed stop-word list (avoids a scikit-learn dependency, which is
# unnecessary weight for a serverless function bundle — the only thing this
# module used sklearn for was ENGLISH_STOP_WORDS and cosine_similarity, both
# trivial to do directly with plain Python/numpy).
_STOP_WORDS = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "he", "in", "is", "it", "its", "of", "on", "or", "that", "the", "this",
    "to", "was", "were", "will", "with", "you", "your", "we", "our", "i",
    "they", "their", "but", "not", "have", "had", "can", "could", "would",
    "should", "about", "into", "than", "then", "so", "if", "which", "who",
    "what", "when", "where", "how", "all", "each", "other", "these", "those",
})

# Optional high-quality embedding model is disabled by default for local
# stability and serverless bundle size. Enable only when explicitly requested:
#   RANKER_USE_SENTENCE_TRANSFORMER=1
SentenceTransformer = None
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
        if token in _STOP_WORDS:
            continue
        idx = hash(token) % 384
        vec[idx] += 1.0

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


def get_cosine_similarity(vec1, vec2) -> float:
    if vec1 is None or vec2 is None:
        return 0.0

    try:
        v1 = np.array(vec1, dtype=float).flatten()
        v2 = np.array(vec2, dtype=float).flatten()

        if v1.size == 0 or v2.size == 0:
            return 0.0

        # Ensure equal dims in fallback scenarios.
        if v1.shape[0] != v2.shape[0]:
            min_dim = min(v1.shape[0], v2.shape[0])
            v1 = v1[:min_dim]
            v2 = v2[:min_dim]

        denom = np.linalg.norm(v1) * np.linalg.norm(v2)
        if denom == 0:
            return 0.0

        return float(np.dot(v1, v2) / denom)
    except Exception:
        return 0.0


def extract_keywords(text: str) -> Set[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", text.lower())
    return {t for t in tokens if t not in _STOP_WORDS and len(t) > 2}


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
