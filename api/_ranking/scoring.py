import json
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

import numpy as np

import ranker


def _load_taxonomy() -> Tuple[Dict[str, Set[str]], Dict[str, Set[str]], Dict[Tuple[str, str], float]]:
    """Loads skills/roles/role-compatibility from skills_taxonomy.json.

    This file is the intended single place to widen matching (its own
    _comment says as much) — do not add terms back into this module.
    """
    path = os.path.join(os.path.dirname(__file__), "skills_taxonomy.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    skill_synonyms = {canonical: set(aliases) for canonical, aliases in data["skills"].items()}
    role_keywords = {role: set(keywords) for role, keywords in data["roles"].items()}
    role_family_compatibility = {}
    for key, weight in data.get("role_family_compatibility", {}).items():
        role_a, role_b = key.split(",")
        role_family_compatibility[(role_a, role_b)] = float(weight)

    return skill_synonyms, role_keywords, role_family_compatibility


SKILL_SYNONYMS, ROLE_KEYWORDS, ROLE_FAMILY_COMPATIBILITY = _load_taxonomy()

# Bounded signal: used as a small additive score only.
BRAND_WEIGHTS: Dict[str, float] = {
    "google": 1.0,
    "meta": 1.0,
    "microsoft": 1.0,
    "amazon": 1.0,
    "apple": 1.0,
    "netflix": 1.0,
    "openai": 1.0,
    "uber": 0.8,
    "airbnb": 0.8,
    "stripe": 0.8,
    "atlassian": 0.8,
    "salesforce": 0.8,
    "adobe": 0.8,
    "oracle": 0.8,
    "sap": 0.8,
    "servicenow": 0.7,
    "ibm": 0.7,
    "intel": 0.7,
    "nvidia": 0.7,
    "tesla": 0.7,
}


@dataclass
class JDSignals:
    required_skills: Set[str]
    must_have_skills: Set[str]
    preferred_skills: Set[str]
    required_years: int
    role: Optional[str]


@dataclass
class CandidateSignals:
    skills: Set[str]
    years: int
    role: Optional[str]
    brand_score: float


def _role_weight_profile(jd_role: Optional[str]):
    # Tuned defaults per role family.
    profiles = {
        "backend": {"semantic": 0.30, "skill": 0.36, "role": 0.20, "experience": 0.10, "brand": 0.04},
        "frontend": {"semantic": 0.32, "skill": 0.34, "role": 0.20, "experience": 0.10, "brand": 0.04},
        "devops": {"semantic": 0.28, "skill": 0.38, "role": 0.20, "experience": 0.10, "brand": 0.04},
        "data_science": {"semantic": 0.36, "skill": 0.30, "role": 0.18, "experience": 0.12, "brand": 0.04},
        "product": {"semantic": 0.38, "skill": 0.24, "role": 0.24, "experience": 0.10, "brand": 0.04},
        "qa": {"semantic": 0.30, "skill": 0.36, "role": 0.20, "experience": 0.10, "brand": 0.04},
    }
    return profiles.get(jd_role or "", {"semantic": 0.35, "skill": 0.30, "role": 0.20, "experience": 0.10, "brand": 0.05})


def _normalize_profile_text(profile_text: Optional[str]) -> str:
    return profile_text.strip() if profile_text else ""


def _weighted_application_vector(resume_text: str, profile_text: str):
    resume_vec = np.array(ranker.encode_text(resume_text), dtype=float)

    if not profile_text:
        return resume_vec.tolist()

    profile_vec = np.array(ranker.encode_text(profile_text), dtype=float)
    weighted = (resume_vec * 0.8) + (profile_vec * 0.2)
    return weighted.tolist()


def _contains_term(text: str, term: str) -> bool:
    if " " in term or "/" in term or "." in term:
        return term in text
    return re.search(rf"\b{re.escape(term)}\b", text) is not None


def _extract_normalized_skills(text: str) -> Set[str]:
    low = text.lower()
    found = set()
    for canonical, aliases in SKILL_SYNONYMS.items():
        if any(_contains_term(low, alias) for alias in aliases):
            found.add(canonical)
    return found


def _extract_skills_from_jd_line(jd_text: str) -> Set[str]:
    required = set()
    for line in jd_text.splitlines():
        if "skill" in line.lower() and ":" in line:
            rhs = line.split(":", 1)[1]
            tokens = [x.strip().lower() for x in re.split(r"[,;/]", rhs) if x.strip()]
            for token in tokens:
                mapped = None
                for canonical, aliases in SKILL_SYNONYMS.items():
                    if token == canonical or token in aliases:
                        mapped = canonical
                        break
                if mapped:
                    required.add(mapped)
    return required


def _extract_must_have_skills(jd_text: str) -> Set[str]:
    must_have = set()
    trigger_terms = ("must", "required", "mandatory", "non-negotiable")
    for line in jd_text.splitlines():
        low = line.lower()
        if any(term in low for term in trigger_terms):
            for canonical, aliases in SKILL_SYNONYMS.items():
                if canonical in low or any(alias in low for alias in aliases):
                    must_have.add(canonical)
    return must_have


def _detect_role(text: str) -> Optional[str]:
    low = text.lower()
    scores = {}
    for role, keywords in ROLE_KEYWORDS.items():
        score = sum(1 for kw in keywords if _contains_term(low, kw))
        if score > 0:
            scores[role] = score

    if not scores:
        return None

    return max(scores, key=scores.get)


def _role_fit(jd_role: Optional[str], cand_role: Optional[str]) -> float:
    if not jd_role:
        return 0.6
    if not cand_role:
        return 0.45
    if jd_role == cand_role:
        return 1.0
    return ROLE_FAMILY_COMPATIBILITY.get((jd_role, cand_role), 0.25)


def _extract_brand_signal(text: str) -> float:
    low = text.lower()
    hits = [weight for company, weight in BRAND_WEIGHTS.items() if _contains_term(low, company)]
    if not hits:
        return 0.5

    # Neutral-to-positive bounded score.
    return float(min(1.0, 0.55 + (sum(hits) / len(hits)) * 0.45))


def _parse_jd_signals(jd_text: str) -> JDSignals:
    required_from_line = _extract_skills_from_jd_line(jd_text)
    must_have = _extract_must_have_skills(jd_text)
    all_detected = _extract_normalized_skills(jd_text)

    if required_from_line:
        required = required_from_line
        preferred = all_detected.difference(required)
    else:
        required = set(list(all_detected)[:6])
        preferred = all_detected.difference(required)

    return JDSignals(
        required_skills=required,
        must_have_skills=must_have,
        preferred_skills=preferred,
        required_years=ranker.extract_years_experience(jd_text),
        role=_detect_role(jd_text),
    )


def _parse_candidate_signals(text: str) -> CandidateSignals:
    return CandidateSignals(
        skills=_extract_normalized_skills(text),
        years=ranker.extract_years_experience(text),
        role=_detect_role(text),
        brand_score=_extract_brand_signal(text),
    )


def _experience_fit(required_years: int, candidate_years: int) -> float:
    if required_years <= 0:
        return 0.6
    if candidate_years >= required_years:
        return 1.0

    gap = required_years - candidate_years
    if gap <= 1:
        return 0.75
    if gap <= 2:
        return 0.55
    return 0.3


def _skill_fit(jd: JDSignals, cand: CandidateSignals) -> Tuple[float, Set[str], Set[str]]:
    matched_required = jd.required_skills.intersection(cand.skills)
    missing_required = jd.required_skills.difference(cand.skills)
    matched_preferred = jd.preferred_skills.intersection(cand.skills)

    req_ratio = (len(matched_required) / len(jd.required_skills)) if jd.required_skills else 0.6
    pref_ratio = (len(matched_preferred) / len(jd.preferred_skills)) if jd.preferred_skills else 0.5

    score = (req_ratio * 0.8) + (pref_ratio * 0.2)
    return max(0.0, min(1.0, score)), matched_required, missing_required


def _gating_multiplier(jd: JDSignals, cand: CandidateSignals, role_fit: float, skill_fit: float) -> float:
    mult = 1.0

    if jd.required_skills:
        matched_required = len(jd.required_skills.intersection(cand.skills))
        required_total = len(jd.required_skills)
        req_ratio = matched_required / required_total
        if req_ratio < 0.2:
            mult *= 0.45
        elif req_ratio < 0.34:
            mult *= 0.6
        elif req_ratio < 0.5:
            mult *= 0.8

        if required_total >= 6 and matched_required < 3:
            mult *= 0.75

        if jd.role and cand.role and cand.role != jd.role and req_ratio < 0.5:
            mult *= 0.8

    if role_fit < 0.35:
        mult *= 0.6

    if jd.required_years > 0 and cand.years < max(0, jd.required_years - 2):
        mult *= 0.85

    if skill_fit < 0.25:
        mult *= 0.8

    # Additional role-critical gates for engineering tracks.
    if jd.role == "backend":
        has_language = any(s in cand.skills for s in {"python", "java", "nodejs", "go", "csharp"})
        has_api_framework = any(s in cand.skills for s in {"django", "fastapi", "flask", "spring", "express"})
        if not has_language:
            mult *= 0.65
        if not has_api_framework:
            mult *= 0.75

    if jd.role == "frontend":
        has_frontend_lang = any(s in cand.skills for s in {"javascript", "typescript"})
        has_frontend_framework = any(s in cand.skills for s in {"react"})
        if not has_frontend_lang:
            mult *= 0.65
        if not has_frontend_framework:
            mult *= 0.75

    return max(0.35, mult)


def _hard_requirement_multiplier(jd: JDSignals, cand: CandidateSignals) -> float:
    mult = 1.0

    if jd.must_have_skills:
        matched_must = len(jd.must_have_skills.intersection(cand.skills))
        must_ratio = matched_must / len(jd.must_have_skills)
        if must_ratio < 0.34:
            mult *= 0.45
        elif must_ratio < 0.67:
            mult *= 0.7

    if jd.required_years > 0 and cand.years < max(0, jd.required_years - 1):
        mult *= 0.8

    return mult


def _build_rationale(
    final_score: float,
    jd: JDSignals,
    cand: CandidateSignals,
    matched_required: Set[str],
    missing_required: Set[str],
    semantic_score: float,
    role_fit: float,
    skill_fit: float,
    experience_fit: float,
    brand_score: float,
):
    if final_score >= 80:
        verdict = "Strong Match"
    elif final_score >= 60:
        verdict = "Good Match"
    elif final_score >= 40:
        verdict = "Potential Match"
    else:
        verdict = "Weak Match"

    matched_text = ", ".join(sorted(list(matched_required))[:5]) if matched_required else "none"
    missing_text = ", ".join(sorted(list(missing_required))[:4]) if missing_required else "none"

    role_line = f"Role fit: {int(role_fit * 100)}%"
    exp_line = (
        f"Experience: {cand.years} yrs vs required {jd.required_years} yrs"
        if jd.required_years > 0
        else f"Experience detected: {cand.years} yrs"
    )

    return (
        f"{verdict} ({final_score:.2f}%). "
        f"Matched required skills: {matched_text}. Missing required skills: {missing_text}. "
        f"{exp_line}. {role_line}. "
        f"Signals - semantic {semantic_score:.1f}%, skill-fit {skill_fit*100:.1f}%, experience-fit {experience_fit*100:.1f}%, brand-signal {brand_score*100:.1f}%."
    )


def score_application(
    job_description: str,
    job_vector,
    resume_text: str,
    profile_text: Optional[str] = None,
    resume_sections: Optional[Dict[str, str]] = None,
):
    normalized_profile = _normalize_profile_text(profile_text)
    scoring_text = resume_text if not normalized_profile else f"{resume_text}\n{normalized_profile}"

    app_vector = _weighted_application_vector(resume_text, normalized_profile)

    jd_signals = _parse_jd_signals(job_description)
    cand_signals = _parse_candidate_signals(scoring_text)

    semantic_full = ranker.get_cosine_similarity(job_vector, app_vector)
    if resume_sections:
        skills_text = (resume_sections.get("skills") or "").strip()
        exp_text = (resume_sections.get("experience") or "").strip()
        skills_semantic = ranker.get_cosine_similarity(job_vector, ranker.encode_text(skills_text)) if skills_text else semantic_full
        exp_semantic = ranker.get_cosine_similarity(job_vector, ranker.encode_text(exp_text)) if exp_text else semantic_full
        semantic = (semantic_full * 0.55) + (skills_semantic * 0.25) + (exp_semantic * 0.20)
    else:
        semantic = semantic_full
    skill_fit, matched_required, missing_required = _skill_fit(jd_signals, cand_signals)
    role_fit = _role_fit(jd_signals.role, cand_signals.role)
    experience_fit = _experience_fit(jd_signals.required_years, cand_signals.years)

    # Small bounded bonus; no negative brand penalty.
    brand_signal = max(0.5, cand_signals.brand_score)

    weights = _role_weight_profile(jd_signals.role)
    base_score = (
        semantic * weights["semantic"]
        + skill_fit * weights["skill"]
        + role_fit * weights["role"]
        + experience_fit * weights["experience"]
        + brand_signal * weights["brand"]
    )

    gate = _gating_multiplier(jd_signals, cand_signals, role_fit, skill_fit)
    hard_gate = _hard_requirement_multiplier(jd_signals, cand_signals)
    final_score_raw = base_score * gate * hard_gate
    final_score_pct = float(round(final_score_raw * 100, 2))

    rationale = _build_rationale(
        final_score=final_score_pct,
        jd=jd_signals,
        cand=cand_signals,
        matched_required=matched_required,
        missing_required=missing_required,
        semantic_score=semantic * 100,
        role_fit=role_fit,
        skill_fit=skill_fit,
        experience_fit=experience_fit,
        brand_score=brand_signal,
    )

    # Keep legacy response keys for compatibility with UI + DB fields.
    return {
        "score": final_score_pct,
        "semantic_score": float(round(semantic * 100, 2)),
        "keyword_score": float(round(skill_fit * 100, 2)),
        "heuristic_score": float(round(((role_fit * 0.45) + (experience_fit * 0.45) + (brand_signal * 0.10)) * 100, 2)),
        "rationale": rationale,
        "embedding": app_vector,
    }
