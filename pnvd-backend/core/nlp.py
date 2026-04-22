"""
PNVD Backend — Module NLP
Deux niveaux :
  1. NLP rapide local  : règles + heuristiques (gratuit, instantané)
  2. NLP Claude API    : analyse profonde (si ANTHROPIC_API_KEY configuré)
"""
import re
import json
import asyncio
import logging
from typing import Optional
from core.config import settings

logger = logging.getLogger("pnvd.nlp")

# ─────────────────────────────────────────────────────────────────────────────
# Dictionnaires de sentiment FR + WOL
# ─────────────────────────────────────────────────────────────────────────────

POS_WORDS = {
    # Français
    "bien", "bon", "bonne", "excellent", "succès", "victoire", "bravo",
    "félicitations", "progrès", "développement", "croissance", "espoir",
    "réussi", "record", "avancée", "accord", "paix", "stabilité",
    "investissement", "opportunité", "amélioration", "positif", "hausse",
    "favorable", "bénéfique", "efficace", "soutien", "solidarité",
    "réforme", "innovation", "réussite", "promesse", "dignité",
    # Wolof
    "baax", "rafet", "bees", "yege", "dem", "kanam", "yam",
}

NEG_WORDS = {
    # Français
    "crise", "grève", "violence", "problème", "danger", "urgent", "mort",
    "attaque", "corruption", "scandale", "fraude", "pénurie", "inflation",
    "colère", "protestation", "condamné", "conflit", "tension", "déficit",
    "échec", "polémique", "controverse", "manifestation", "arrestation",
    "emprisonné", "détenu", "accusé", "fuite", "exil", "répression",
    "licenciement", "chômage", "pauvreté", "inégalité", "injustice",
    "impunité", "détournement", "pillage", "censure", "fermeture",
    # Wolof
    "xam-xam", "dafa neex", "naffa", "dégér", "yëgël ci kanam",
}

WOLOF_MARKERS = {
    "dafa", "moom", "xam", "waaw", "dégg", "boo", "nit", "sunu",
    "léegi", "fii", "foofu", "benn", "ñepp", "jamm", "bëgg",
    "yëgël", "wax", "nekk", "dem", "ànd",
}

REGION_MAP = {
    "Dakar":        ["dakar", "plateau", "pikine", "guédiawaye", "rufisque", "bargny", "sébikotane"],
    "Thiès":        ["thiès", "thies", "mbour", "tivaouane", "saly", "joal", "popenguine"],
    "Ziguinchor":   ["ziguinchor", "casamance", "bignona", "oussouye", "sédhiou"],
    "Saint-Louis":  ["saint-louis", "podor", "dagana", "richard-toll", "matam"],
    "Kaolack":      ["kaolack", "nioro", "guinguinéo", "foundiougne", "fatick"],
    "Diourbel":     ["diourbel", "touba", "mbacké", "bambey"],
    "Tambacounda":  ["tambacounda", "bakel", "goudiry", "koumpentoum"],
    "Kédougou":     ["kédougou", "saraya", "salemata"],
    "Louga":        ["louga", "linguère", "kébémer"],
    "Matam":        ["matam", "kanel", "ranérou"],
    "Kolda":        ["kolda", "vélingara", "médina yoro foulah"],
    "Sédhiou":      ["sédhiou", "bounkiling", "goudomp"],
    "Kaffrine":     ["kaffrine", "koungheul", "birkelane"],
    "Kolda":        ["kolda", "vélingara"],
}

DISINFORMATION_PATTERNS = [
    r"URGENT\s*:",
    r"BREAKING\s*:",
    r"EXCLUSIF\s*!",
    r"ils ne veulent pas que vous sachiez",
    r"la vérité cachée",
    r"ce qu['']on vous cache",
    r"révélation choc",
    r"share before deleted",
    r"avant que ça soit supprimé",
    r"\d{3,}000 morts? (en|au)",
]


def detect_language(text: str) -> str:
    """Détecte FR ou WOL à partir du texte."""
    words = set(text.lower().split())
    wolof_hits = len(words & WOLOF_MARKERS)
    if wolof_hits >= 2:
        return "WOL"
    try:
        from langdetect import detect
        lang = detect(text)
        return "FR" if lang in ("fr", "pt", "es") else "WOL" if lang == "wo" else "FR"
    except Exception:
        return "FR"


def infer_sentiment(text: str) -> tuple[str, float]:
    """
    Retourne (sentiment, score) où score ∈ [-1, 1].
    sentiment = 'positif' | 'neutre' | 'negatif'
    """
    t = text.lower()
    words = set(re.findall(r'\w+', t))
    pos = len(words & POS_WORDS)
    neg = len(words & NEG_WORDS)
    total = pos + neg
    if total == 0:
        return "neutre", 0.0
    score = (pos - neg) / max(total, 1)
    if score > 0.1:
        return "positif", round(score, 3)
    elif score < -0.1:
        return "negatif", round(score, 3)
    return "neutre", round(score, 3)


def infer_region(text: str) -> str:
    """Détecte la région sénégalaise mentionnée dans le texte."""
    t = text.lower()
    for region, keywords in REGION_MAP.items():
        if any(k in t for k in keywords):
            return region
    return "National"


def extract_topics_local(text: str) -> list[str]:
    """Extraction de topics basique par mots-clés thématiques."""
    t = text.lower()
    topics = []
    TOPIC_MAP = {
        "Politique":      ["élection", "président", "gouvernement", "ministère", "parlement", "assemblée", "opposition", "parti"],
        "Économie":       ["économie", "budget", "finances", "investissement", "croissance", "inflation", "dette", "pib", "cfa"],
        "Sécurité":       ["sécurité", "police", "armée", "gendarmerie", "terrorisme", "crime", "violence"],
        "Énergie":        ["pétrole", "gaz", "sangomar", "electricité", "energie", "senelec", "carburant"],
        "Éducation":      ["école", "université", "bac", "bfem", "ucad", "enseignement", "étudiant"],
        "Santé":          ["hôpital", "médecin", "santé", "maladie", "vaccin", "épidémie", "covid"],
        "Social":         ["manifestation", "grève", "syndicat", "travail", "salaire", "chômage"],
        "Diasporas":      ["diaspora", "émigration", "migration", "europe", "france", "italie"],
        "Agriculture":    ["agriculture", "récolte", "pluie", "hivernage", "élevage", "pêche"],
        "Infrastructure": ["route", "autoroute", "ter", "brt", "aéroport", "port", "infrastructure"],
    }
    for topic, keywords in TOPIC_MAP.items():
        if any(k in t for k in keywords):
            topics.append(topic)
    return topics[:3]


def check_disinformation(text: str) -> bool:
    """Détection heuristique de désinformation."""
    for pattern in DISINFORMATION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    # Majuscules excessives
    words = text.split()
    if len(words) > 5:
        upper_ratio = sum(1 for w in words if w.isupper() and len(w) > 2) / len(words)
        if upper_ratio > 0.4:
            return True
    return False


def analyze_local(title: str, text: str) -> dict:
    """Analyse NLP complète sans API externe."""
    full_text = f"{title} {text}"
    sentiment, score = infer_sentiment(full_text)
    return {
        "lang": detect_language(full_text),
        "sentiment": sentiment,
        "sentiment_score": score,
        "region": infer_region(full_text),
        "topics": extract_topics_local(full_text),
        "is_disinformation": check_disinformation(full_text),
        "nlp_source": "local",
    }


# ─────────────────────────────────────────────────────────────────────────────
# NLP via Claude API (si disponible)
# ─────────────────────────────────────────────────────────────────────────────

CLAUDE_PROMPT = """Tu es un expert en analyse de contenu médiatique sénégalais.
Analyse ce texte et retourne UNIQUEMENT un JSON valide avec cette structure :
{{
  "lang": "FR" ou "WOL",
  "sentiment": "positif" ou "neutre" ou "negatif",
  "sentiment_score": nombre entre -1.0 et 1.0,
  "topics": ["topic1", "topic2"],
  "entities": ["entité1", "entité2"],
  "region": "nom de la région sénégalaise ou National",
  "is_disinformation": true ou false,
  "summary": "résumé en 1 phrase"
}}
Réponds UNIQUEMENT avec le JSON brut, sans backticks, sans texte avant ou après.
Texte à analyser :
{text}"""


_anthropic_client = None

def _get_anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic
        _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


async def analyze_with_claude(title: str, text: str) -> Optional[dict]:
    """Analyse NLP approfondie via Claude API."""
    if not settings.nlp_enabled:
        return None
    try:
        client = _get_anthropic_client()
        full_text = f"{title}\n\n{text}"[:2000]
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": CLAUDE_PROMPT.format(text=full_text)
            }]
        )
        logger.warning(f"Clauuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuude: {message}")
        raw = message.content[0].text.strip()
        # Extraire le JSON même s'il y a du texte autour
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            result = json.loads(match.group())
            result["nlp_source"] = "claude"
            return result
    except Exception as e:
        logger.warning(f"Claude NLP failed: {e}")
    return None


async def analyze_article(title: str, text: str) -> dict:
    """
    Point d'entrée principal : Claude si dispo, sinon local.
    Toujours retourne un dict complet.
    """
    # Essai Claude en premier
    result = await analyze_with_claude(title, text)
    if result:
        return result
    # Fallback local
    return analyze_local(title, text)
