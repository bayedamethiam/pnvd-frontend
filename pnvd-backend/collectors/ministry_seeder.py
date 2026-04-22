"""
PNVD — Ministry Seeder
Initialise la hiérarchie ministérielle complète du gouvernement sénégalais
et les mots-clés de chaque secteur.

Structure :
    Présidence
    └── Primature
        ├── Ministère Télécommunications & Numérique
        ├── Ministère des Finances
        ├── Ministère du Commerce
        ├── Ministère de la Santé
        ├── Ministère de l'Éducation nationale
        ├── Ministère de l'Enseignement supérieur
        ├── Ministère de la Femme
        ├── Ministère de la Jeunesse & Sports
        ├── Ministère de l'Intérieur
        ├── Ministère de la Justice
        ├── Ministère des Forces armées
        ├── Ministère de l'Énergie & Pétrole
        ├── Ministère des Infrastructures & Transports
        ├── Ministère de l'Hydraulique
        ├── Ministère de l'Agriculture
        ├── Ministère de l'Environnement
        ├── Ministère de la Pêche
        ├── Ministère des Affaires étrangères
        └── Ministère du Tourisme
"""
import logging

from sqlalchemy import select
from core.database import AsyncSessionLocal, Ministry, MinistryKeyword, MinistrySource, Source

logger = logging.getLogger("pnvd.ministry_seeder")


# ─────────────────────────────────────────────────────────────────────────────
# HIÉRARCHIE (nœuds non-ministry)
# ─────────────────────────────────────────────────────────────────────────────

HIERARCHY = [
    {
        "id": "presidence",
        "name": "Présidence de la République",
        "short_name": "Présidence",
        "level": "presidence",
        "parent_id": None,
        "color": "#1D4ED8",
        "icon": "🏛️",
    },
    {
        "id": "primature",
        "name": "Primature — Services du Premier Ministre",
        "short_name": "Primature",
        "level": "primature",
        "parent_id": "presidence",
        "color": "#7C3AED",
        "icon": "⚖️",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# MINISTÈRES + MOTS-CLÉS
# ─────────────────────────────────────────────────────────────────────────────

MINISTRIES = [

    # ══════════════════════════════════════════════════════════════════════════
    # PÔLE NUMÉRIQUE
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "telecoms",
        "name": "Ministère de la Communication, des Télécommunications et du Numérique",
        "short_name": "Télécommunications",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable du secteur des télécommunications, du numérique, "
            "de la régulation des opérateurs téléphoniques et internet, "
            "et de la transformation numérique du Sénégal."
        ),
        "color": "#0891B2",
        "icon": "📡",
        "keywords": [
            {"term": "ARTP",                          "type": "institution", "weight": 5},
            {"term": "Sonatel",                        "type": "institution", "weight": 5},
            {"term": "Orange Sénégal",                 "type": "institution", "weight": 5},
            {"term": "Free Sénégal",                   "type": "institution", "weight": 5},
            {"term": "Expresso Sénégal",               "type": "institution", "weight": 4},
            {"term": "SENUM SA",                       "type": "institution", "weight": 4},
            {"term": "ADIE",                           "type": "institution", "weight": 4},
            {"term": "CDP Sénégal",                    "type": "institution", "weight": 4},
            {"term": "Smart Sénégal",                  "type": "program",     "weight": 5},
            {"term": "Sénégal Numérique 2025",         "type": "program",     "weight": 5},
            {"term": "e-gouvernement",                 "type": "program",     "weight": 4},
            {"term": "transformation numérique",       "type": "program",     "weight": 4},
            {"term": "Dakar Digital City",             "type": "program",     "weight": 4},
            {"term": "télécommunications",             "type": "keyword",     "weight": 5},
            {"term": "réseau mobile",                  "type": "keyword",     "weight": 4},
            {"term": "internet",                       "type": "keyword",     "weight": 3},
            {"term": "fibre optique",                  "type": "keyword",     "weight": 4},
            {"term": "haut débit",                     "type": "keyword",     "weight": 4},
            {"term": "4G",                             "type": "keyword",     "weight": 4},
            {"term": "5G",                             "type": "keyword",     "weight": 5},
            {"term": "data center",                    "type": "keyword",     "weight": 4},
            {"term": "coupure internet",               "type": "keyword",     "weight": 5},
            {"term": "coupure réseau",                 "type": "keyword",     "weight": 5},
            {"term": "opérateur téléphonique",         "type": "keyword",     "weight": 4},
            {"term": "tarif mobile",                   "type": "keyword",     "weight": 4},
            {"term": "mobile money",                   "type": "keyword",     "weight": 3},
            {"term": "Orange Money",                   "type": "keyword",     "weight": 3},
            {"term": "Wave",                           "type": "keyword",     "weight": 3},
            {"term": "cybersécurité",                  "type": "keyword",     "weight": 4},
            {"term": "cyberattaque",                   "type": "keyword",     "weight": 5},
            {"term": "protection des données",         "type": "keyword",     "weight": 4},
            {"term": "startup numérique",              "type": "keyword",     "weight": 3},
            {"term": "intelligence artificielle",      "type": "keyword",     "weight": 3},
            {"term": "#ARTP",                          "type": "hashtag",     "weight": 5},
            {"term": "#Sonatel",                       "type": "hashtag",     "weight": 4},
            {"term": "#SmartSenegal",                  "type": "hashtag",     "weight": 5},
            {"term": "#DigitalSenegal",                "type": "hashtag",     "weight": 5},
            {"term": "#5GSenegal",                     "type": "hashtag",     "weight": 5},
            {"term": "#CoupureInternet",               "type": "hashtag",     "weight": 5},
            {"term": "#CybersecuriteSN",               "type": "hashtag",     "weight": 4},
            {"term": "#TransformationNumerique",       "type": "hashtag",     "weight": 4},
        ],
    },

    # ══════════════════════════════════════════════════════════════════════════
    # PÔLE ÉCONOMIQUE
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "finances",
        "name": "Ministère des Finances et du Budget",
        "short_name": "Finances",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la politique budgétaire, fiscale et financière du Sénégal. "
            "Gestion du budget national, de la dette publique, de la fiscalité "
            "et de la coopération financière internationale."
        ),
        "color": "#D97706",
        "icon": "💰",
        "keywords": [
            {"term": "DGID",                           "type": "institution", "weight": 5},
            {"term": "Direction des Impôts",           "type": "institution", "weight": 5},
            {"term": "Trésor sénégalais",              "type": "institution", "weight": 5},
            {"term": "BCEAO",                          "type": "institution", "weight": 4},
            {"term": "FMI Sénégal",                    "type": "institution", "weight": 4},
            {"term": "Banque mondiale Sénégal",        "type": "institution", "weight": 4},
            {"term": "budget national",                "type": "keyword",     "weight": 5},
            {"term": "loi de finances",                "type": "keyword",     "weight": 5},
            {"term": "budget Sénégal",                 "type": "keyword",     "weight": 5},
            {"term": "dette publique",                 "type": "keyword",     "weight": 5},
            {"term": "déficit budgétaire",             "type": "keyword",     "weight": 5},
            {"term": "fiscalité",                      "type": "keyword",     "weight": 4},
            {"term": "impôts",                         "type": "keyword",     "weight": 4},
            {"term": "recettes fiscales",              "type": "keyword",     "weight": 4},
            {"term": "TVA",                            "type": "keyword",     "weight": 3},
            {"term": "subventions",                    "type": "keyword",     "weight": 4},
            {"term": "Eurobond",                       "type": "keyword",     "weight": 4},
            {"term": "eurobonds Sénégal",              "type": "keyword",     "weight": 4},
            {"term": "dépenses publiques",             "type": "keyword",     "weight": 4},
            {"term": "ajustement budgétaire",          "type": "keyword",     "weight": 4},
            {"term": "audit des finances",             "type": "keyword",     "weight": 4},
            {"term": "pétrole Sénégal recettes",       "type": "keyword",     "weight": 4},
            {"term": "inflation",                      "type": "keyword",     "weight": 4},
            {"term": "croissance économique",          "type": "keyword",     "weight": 4},
            {"term": "Plan Sénégal Émergent",          "type": "program",     "weight": 5},
            {"term": "PSE",                            "type": "program",     "weight": 4},
            {"term": "Vision Sénégal 2050",            "type": "program",     "weight": 5},
            {"term": "#BudgetSenegal",                 "type": "hashtag",     "weight": 5},
            {"term": "#FinancesSN",                    "type": "hashtag",     "weight": 4},
            {"term": "#DetteSenegal",                  "type": "hashtag",     "weight": 5},
            {"term": "#LoidesFinances",                "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "commerce",
        "name": "Ministère du Commerce, de la Consommation et des PME",
        "short_name": "Commerce",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la régulation commerciale, de la protection des consommateurs, "
            "du développement des PME et de la politique industrielle du Sénégal."
        ),
        "color": "#D97706",
        "icon": "🏪",
        "keywords": [
            {"term": "ADEPME",                         "type": "institution", "weight": 5},
            {"term": "Chambre de Commerce Dakar",      "type": "institution", "weight": 4},
            {"term": "CCIAD",                          "type": "institution", "weight": 4},
            {"term": "PME Sénégal",                    "type": "keyword",     "weight": 5},
            {"term": "commerce Sénégal",               "type": "keyword",     "weight": 4},
            {"term": "prix des denrées",               "type": "keyword",     "weight": 5},
            {"term": "cherté de la vie",               "type": "keyword",     "weight": 5},
            {"term": "prix carburant",                 "type": "keyword",     "weight": 5},
            {"term": "inflation des prix",             "type": "keyword",     "weight": 4},
            {"term": "coût de la vie",                 "type": "keyword",     "weight": 4},
            {"term": "marché noir",                    "type": "keyword",     "weight": 4},
            {"term": "fraude commerciale",             "type": "keyword",     "weight": 4},
            {"term": "exportations Sénégal",           "type": "keyword",     "weight": 4},
            {"term": "importations Sénégal",           "type": "keyword",     "weight": 4},
            {"term": "balance commerciale",            "type": "keyword",     "weight": 4},
            {"term": "zone franche",                   "type": "keyword",     "weight": 3},
            {"term": "industrie sénégalaise",          "type": "keyword",     "weight": 3},
            {"term": "#PMESenegal",                    "type": "hashtag",     "weight": 4},
            {"term": "#CherteVie",                     "type": "hashtag",     "weight": 5},
            {"term": "#PrixCarburant",                 "type": "hashtag",     "weight": 5},
        ],
    },

    # ══════════════════════════════════════════════════════════════════════════
    # PÔLE SOCIAL
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "sante",
        "name": "Ministère de la Santé et de l'Action sociale",
        "short_name": "Santé",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la politique de santé publique, des hôpitaux, "
            "de la lutte contre les maladies, de la couverture maladie universelle "
            "et de l'action sociale au Sénégal."
        ),
        "color": "#059669",
        "icon": "🏥",
        "keywords": [
            {"term": "Hôpital Principal Dakar",        "type": "institution", "weight": 5},
            {"term": "CHNU Fann",                      "type": "institution", "weight": 5},
            {"term": "CHU de Dakar",                   "type": "institution", "weight": 4},
            {"term": "CNTS",                           "type": "institution", "weight": 4},
            {"term": "CMU",                            "type": "program",     "weight": 5},
            {"term": "couverture maladie universelle", "type": "program",     "weight": 5},
            {"term": "Programme élargi vaccination",   "type": "program",     "weight": 4},
            {"term": "Plan Sésame",                    "type": "program",     "weight": 4},
            {"term": "santé publique",                 "type": "keyword",     "weight": 5},
            {"term": "système de santé",               "type": "keyword",     "weight": 4},
            {"term": "hôpitaux Sénégal",               "type": "keyword",     "weight": 5},
            {"term": "crise sanitaire",                "type": "keyword",     "weight": 5},
            {"term": "épidémie",                       "type": "keyword",     "weight": 5},
            {"term": "paludisme",                      "type": "keyword",     "weight": 4},
            {"term": "tuberculose Sénégal",            "type": "keyword",     "weight": 4},
            {"term": "VIH Sénégal",                    "type": "keyword",     "weight": 4},
            {"term": "médicaments",                    "type": "keyword",     "weight": 3},
            {"term": "personnel médical",              "type": "keyword",     "weight": 4},
            {"term": "grève médecins",                 "type": "keyword",     "weight": 5},
            {"term": "grève infirmiers",               "type": "keyword",     "weight": 5},
            {"term": "déserts médicaux",               "type": "keyword",     "weight": 4},
            {"term": "mortalité maternelle",           "type": "keyword",     "weight": 5},
            {"term": "mortalité infantile",            "type": "keyword",     "weight": 5},
            {"term": "vaccination",                    "type": "keyword",     "weight": 4},
            {"term": "action sociale",                 "type": "keyword",     "weight": 3},
            {"term": "handicap Sénégal",               "type": "keyword",     "weight": 3},
            {"term": "#SanteSenegal",                  "type": "hashtag",     "weight": 5},
            {"term": "#CMUSenegal",                    "type": "hashtag",     "weight": 5},
            {"term": "#HopitalSN",                     "type": "hashtag",     "weight": 4},
            {"term": "#GreveSante",                    "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "education",
        "name": "Ministère de l'Éducation nationale",
        "short_name": "Éducation",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de l'enseignement préscolaire, élémentaire et secondaire, "
            "de la formation des enseignants, de l'accès à l'école pour tous "
            "et des examens nationaux au Sénégal."
        ),
        "color": "#059669",
        "icon": "📚",
        "keywords": [
            {"term": "IDEN",                           "type": "institution", "weight": 4},
            {"term": "FASTEF",                         "type": "institution", "weight": 4},
            {"term": "Inspection Académie",            "type": "institution", "weight": 4},
            {"term": "BFEM",                           "type": "keyword",     "weight": 5},
            {"term": "BAC Sénégal",                    "type": "keyword",     "weight": 5},
            {"term": "résultats BFEM",                 "type": "keyword",     "weight": 5},
            {"term": "résultats BAC",                  "type": "keyword",     "weight": 5},
            {"term": "école publique",                 "type": "keyword",     "weight": 4},
            {"term": "taux de scolarisation",          "type": "keyword",     "weight": 4},
            {"term": "grève enseignants",              "type": "keyword",     "weight": 5},
            {"term": "syndicat enseignants",           "type": "keyword",     "weight": 4},
            {"term": "CUSEMS",                         "type": "institution", "weight": 4},
            {"term": "SAEMS",                          "type": "institution", "weight": 4},
            {"term": "SELS",                           "type": "institution", "weight": 4},
            {"term": "manuels scolaires",              "type": "keyword",     "weight": 4},
            {"term": "table-bancs",                    "type": "keyword",     "weight": 4},
            {"term": "abri provisoire",                "type": "keyword",     "weight": 4},
            {"term": "année scolaire",                 "type": "keyword",     "weight": 3},
            {"term": "calendrier scolaire",            "type": "keyword",     "weight": 3},
            {"term": "décrochage scolaire",            "type": "keyword",     "weight": 4},
            {"term": "talibé",                         "type": "keyword",     "weight": 4},
            {"term": "daara",                          "type": "keyword",     "weight": 3},
            {"term": "#BFEM",                          "type": "hashtag",     "weight": 5},
            {"term": "#BACSenegal",                    "type": "hashtag",     "weight": 5},
            {"term": "#GreveEnseignants",              "type": "hashtag",     "weight": 5},
            {"term": "#EcoleSenegal",                  "type": "hashtag",     "weight": 4},
        ],
    },
    {
        "id": "ensup",
        "name": "Ministère de l'Enseignement supérieur, de la Recherche et de l'Innovation",
        "short_name": "Enseignement supérieur",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable des universités, grandes écoles, recherche scientifique "
            "et de l'innovation au Sénégal."
        ),
        "color": "#059669",
        "icon": "🎓",
        "keywords": [
            {"term": "UCAD",                           "type": "institution", "weight": 5},
            {"term": "Université Cheikh Anta Diop",    "type": "institution", "weight": 5},
            {"term": "UGB",                            "type": "institution", "weight": 5},
            {"term": "Université Gaston Berger",       "type": "institution", "weight": 5},
            {"term": "UASZ",                           "type": "institution", "weight": 4},
            {"term": "Université Ziguinchor",          "type": "institution", "weight": 4},
            {"term": "ESMT",                           "type": "institution", "weight": 4},
            {"term": "ISE",                            "type": "institution", "weight": 4},
            {"term": "ANAQ-Sup",                       "type": "institution", "weight": 4},
            {"term": "grève étudiants",                "type": "keyword",     "weight": 5},
            {"term": "crise universitaire",            "type": "keyword",     "weight": 5},
            {"term": "bourse étudiant",                "type": "keyword",     "weight": 5},
            {"term": "CROUS Sénégal",                  "type": "institution", "weight": 5},
            {"term": "restauration universitaire",     "type": "keyword",     "weight": 4},
            {"term": "résidences universitaires",      "type": "keyword",     "weight": 4},
            {"term": "fuite des cerveaux",             "type": "keyword",     "weight": 4},
            {"term": "recherche scientifique",         "type": "keyword",     "weight": 4},
            {"term": "doctorat Sénégal",               "type": "keyword",     "weight": 3},
            {"term": "#UCAD",                          "type": "hashtag",     "weight": 5},
            {"term": "#UniversiteSenegal",             "type": "hashtag",     "weight": 4},
            {"term": "#BourseEtudiants",               "type": "hashtag",     "weight": 5},
            {"term": "#GreveUCAD",                     "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "femme",
        "name": "Ministère de la Femme, de la Famille et de la Protection des Enfants",
        "short_name": "Femme & Famille",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la promotion des droits des femmes, de l'égalité de genre, "
            "de la protection des enfants et de la famille au Sénégal."
        ),
        "color": "#059669",
        "icon": "👩‍👧",
        "keywords": [
            {"term": "autonomisation femmes",          "type": "keyword",     "weight": 5},
            {"term": "violences faites aux femmes",    "type": "keyword",     "weight": 5},
            {"term": "violences basées genre",         "type": "keyword",     "weight": 5},
            {"term": "mariage précoce",                "type": "keyword",     "weight": 5},
            {"term": "excision",                       "type": "keyword",     "weight": 5},
            {"term": "mutilations génitales",          "type": "keyword",     "weight": 5},
            {"term": "parité",                         "type": "keyword",     "weight": 4},
            {"term": "droits des femmes",              "type": "keyword",     "weight": 4},
            {"term": "travail des enfants",            "type": "keyword",     "weight": 5},
            {"term": "enfants talibés",                "type": "keyword",     "weight": 5},
            {"term": "protection de l'enfance",        "type": "keyword",     "weight": 5},
            {"term": "viol Sénégal",                   "type": "keyword",     "weight": 5},
            {"term": "féminicide",                     "type": "keyword",     "weight": 5},
            {"term": "violences conjugales",           "type": "keyword",     "weight": 5},
            {"term": "FONGIP",                         "type": "institution", "weight": 4},
            {"term": "#VBG",                           "type": "hashtag",     "weight": 5},
            {"term": "#DroitsFemmes",                  "type": "hashtag",     "weight": 5},
            {"term": "#ProtectionEnfants",             "type": "hashtag",     "weight": 5},
            {"term": "#MariagePrecoce",                "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "jeunesse",
        "name": "Ministère de la Jeunesse, des Sports et de la Culture",
        "short_name": "Jeunesse & Sports",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la politique de jeunesse, des sports, de la culture, "
            "du développement du sport sénégalais et de l'emploi des jeunes."
        ),
        "color": "#059669",
        "icon": "⚽",
        "keywords": [
            {"term": "équipe nationale football",      "type": "keyword",     "weight": 5},
            {"term": "Lions du Sénégal",               "type": "keyword",     "weight": 5},
            {"term": "Sadio Mané",                     "type": "person",      "weight": 4},
            {"term": "FESF",                           "type": "institution", "weight": 4},
            {"term": "FSF",                            "type": "institution", "weight": 5},
            {"term": "CAN football",                   "type": "keyword",     "weight": 5},
            {"term": "sport Sénégal",                  "type": "keyword",     "weight": 4},
            {"term": "lutte sénégalaise",              "type": "keyword",     "weight": 5},
            {"term": "Arène nationale",                "type": "institution", "weight": 4},
            {"term": "chômage jeunes",                 "type": "keyword",     "weight": 5},
            {"term": "emploi jeunes",                  "type": "keyword",     "weight": 5},
            {"term": "émigration irrégulière",         "type": "keyword",     "weight": 5},
            {"term": "pirogue migrants",               "type": "keyword",     "weight": 5},
            {"term": "culture sénégalaise",            "type": "keyword",     "weight": 3},
            {"term": "DKZN",                           "type": "keyword",     "weight": 3},
            {"term": "hip-hop sénégalais",             "type": "keyword",     "weight": 3},
            {"term": "#LionsDuTeranga",                "type": "hashtag",     "weight": 5},
            {"term": "#SenegalFootball",               "type": "hashtag",     "weight": 5},
            {"term": "#EmploiJeunesSN",                "type": "hashtag",     "weight": 5},
            {"term": "#EmigrationSN",                  "type": "hashtag",     "weight": 5},
        ],
    },

    # ══════════════════════════════════════════════════════════════════════════
    # PÔLE SÉCURITÉ & JUSTICE
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "interieur",
        "name": "Ministère de l'Intérieur et de la Sécurité publique",
        "short_name": "Intérieur",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la sécurité publique, de l'ordre intérieur, "
            "de la police nationale, de la gendarmerie, des élections "
            "et de l'administration territoriale du Sénégal."
        ),
        "color": "#DC2626",
        "icon": "🚔",
        "keywords": [
            {"term": "Police nationale",               "type": "institution", "weight": 5},
            {"term": "Gendarmerie nationale",          "type": "institution", "weight": 5},
            {"term": "OCRB",                           "type": "institution", "weight": 4},
            {"term": "DSTM",                           "type": "institution", "weight": 4},
            {"term": "sécurité publique",              "type": "keyword",     "weight": 5},
            {"term": "criminalité Sénégal",            "type": "keyword",     "weight": 5},
            {"term": "insécurité Dakar",               "type": "keyword",     "weight": 5},
            {"term": "manifestation",                  "type": "keyword",     "weight": 5},
            {"term": "interpellation",                 "type": "keyword",     "weight": 4},
            {"term": "arrestation",                    "type": "keyword",     "weight": 4},
            {"term": "maintien de l'ordre",            "type": "keyword",     "weight": 4},
            {"term": "gaz lacrymogène",                "type": "keyword",     "weight": 5},
            {"term": "couvre-feu",                     "type": "keyword",     "weight": 5},
            {"term": "état d'urgence",                 "type": "keyword",     "weight": 5},
            {"term": "élections Sénégal",              "type": "keyword",     "weight": 5},
            {"term": "CENA",                           "type": "institution", "weight": 5},
            {"term": "liste électorale",               "type": "keyword",     "weight": 4},
            {"term": "fraude électorale",              "type": "keyword",     "weight": 5},
            {"term": "résultats élections",            "type": "keyword",     "weight": 5},
            {"term": "#SecuriteSN",                    "type": "hashtag",     "weight": 5},
            {"term": "#ElectionsSenegal",              "type": "hashtag",     "weight": 5},
            {"term": "#ManifestationSN",               "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "justice",
        "name": "Ministère de la Justice et des Droits humains",
        "short_name": "Justice",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable du système judiciaire sénégalais, des droits humains, "
            "du système pénitentiaire, de la lutte contre la corruption "
            "et de la réforme judiciaire."
        ),
        "color": "#DC2626",
        "icon": "⚖️",
        "keywords": [
            {"term": "Cour suprême",                   "type": "institution", "weight": 5},
            {"term": "Conseil constitutionnel",        "type": "institution", "weight": 5},
            {"term": "CREI",                           "type": "institution", "weight": 5},
            {"term": "Parquet",                        "type": "institution", "weight": 4},
            {"term": "tribunal Sénégal",               "type": "keyword",     "weight": 4},
            {"term": "détention provisoire",           "type": "keyword",     "weight": 5},
            {"term": "prisonniers politiques",         "type": "keyword",     "weight": 5},
            {"term": "liberté de presse",              "type": "keyword",     "weight": 5},
            {"term": "droits humains",                 "type": "keyword",     "weight": 5},
            {"term": "corruption Sénégal",             "type": "keyword",     "weight": 5},
            {"term": "malversation",                   "type": "keyword",     "weight": 4},
            {"term": "détournement fonds",             "type": "keyword",     "weight": 5},
            {"term": "reddition des comptes",          "type": "keyword",     "weight": 5},
            {"term": "liberté d'expression",           "type": "keyword",     "weight": 5},
            {"term": "amnistie",                       "type": "keyword",     "weight": 5},
            {"term": "condamné",                       "type": "keyword",     "weight": 3},
            {"term": "#JusticeSenegal",                "type": "hashtag",     "weight": 5},
            {"term": "#CorruptionSN",                  "type": "hashtag",     "weight": 5},
            {"term": "#LibertePresse",                 "type": "hashtag",     "weight": 5},
            {"term": "#RedditionComptes",              "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "armees",
        "name": "Ministère des Forces armées",
        "short_name": "Forces armées",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la défense nationale, des forces armées sénégalaises, "
            "de la sécurité aux frontières et de la participation aux opérations "
            "de maintien de la paix."
        ),
        "color": "#DC2626",
        "icon": "🎖️",
        "keywords": [
            {"term": "armée sénégalaise",              "type": "institution", "weight": 5},
            {"term": "Forces armées Sénégal",          "type": "institution", "weight": 5},
            {"term": "Marine sénégalaise",             "type": "institution", "weight": 4},
            {"term": "Armée de l'air Sénégal",         "type": "institution", "weight": 4},
            {"term": "défense nationale",              "type": "keyword",     "weight": 5},
            {"term": "sécurité frontières",            "type": "keyword",     "weight": 5},
            {"term": "Casamance conflit",              "type": "keyword",     "weight": 5},
            {"term": "MFDC",                           "type": "institution", "weight": 5},
            {"term": "rébellion Casamance",            "type": "keyword",     "weight": 5},
            {"term": "opération militaire",            "type": "keyword",     "weight": 4},
            {"term": "MINUSMA",                        "type": "institution", "weight": 3},
            {"term": "maintien de la paix",            "type": "keyword",     "weight": 4},
            {"term": "terrorisme Sénégal",             "type": "keyword",     "weight": 5},
            {"term": "djihadisme",                     "type": "keyword",     "weight": 4},
            {"term": "#ArmeeSenegal",                  "type": "hashtag",     "weight": 5},
            {"term": "#DefenseNationale",              "type": "hashtag",     "weight": 4},
            {"term": "#Casamance",                     "type": "hashtag",     "weight": 5},
        ],
    },

    # ══════════════════════════════════════════════════════════════════════════
    # PÔLE INFRASTRUCTURES & ÉNERGIE
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "energie",
        "name": "Ministère de l'Énergie, du Pétrole et des Mines",
        "short_name": "Énergie & Pétrole",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la politique énergétique, de l'exploitation pétrolière et gazière, "
            "des mines et de l'électrification du Sénégal. "
            "Supervise les projets Sangomar, GTA et Grand Tortue."
        ),
        "color": "#7C3AED",
        "icon": "⚡",
        "keywords": [
            {"term": "SENELEC",                        "type": "institution", "weight": 5},
            {"term": "PETROSEN",                       "type": "institution", "weight": 5},
            {"term": "SAR",                            "type": "institution", "weight": 4},
            {"term": "Woodside",                       "type": "institution", "weight": 5},
            {"term": "BP Sénégal",                     "type": "institution", "weight": 4},
            {"term": "Sangomar",                       "type": "keyword",     "weight": 5},
            {"term": "champ pétrolier Sangomar",       "type": "keyword",     "weight": 5},
            {"term": "GTA",                            "type": "keyword",     "weight": 5},
            {"term": "Grand Tortue Ahmeyim",           "type": "keyword",     "weight": 5},
            {"term": "gaz naturel Sénégal",            "type": "keyword",     "weight": 5},
            {"term": "pétrole Sénégal",                "type": "keyword",     "weight": 5},
            {"term": "recettes pétrolières",           "type": "keyword",     "weight": 5},
            {"term": "coupure électricité",            "type": "keyword",     "weight": 5},
            {"term": "délestage",                      "type": "keyword",     "weight": 5},
            {"term": "électricité Sénégal",            "type": "keyword",     "weight": 4},
            {"term": "énergie solaire Sénégal",        "type": "keyword",     "weight": 4},
            {"term": "énergies renouvelables",         "type": "keyword",     "weight": 4},
            {"term": "prix hydrocarbures",             "type": "keyword",     "weight": 4},
            {"term": "raffinerie",                     "type": "keyword",     "weight": 3},
            {"term": "mines Sénégal",                  "type": "keyword",     "weight": 4},
            {"term": "phosphates",                     "type": "keyword",     "weight": 4},
            {"term": "zircon Sénégal",                 "type": "keyword",     "weight": 3},
            {"term": "#Sangomar",                      "type": "hashtag",     "weight": 5},
            {"term": "#PetroleSenegal",                "type": "hashtag",     "weight": 5},
            {"term": "#SENELEC",                       "type": "hashtag",     "weight": 5},
            {"term": "#Delestage",                     "type": "hashtag",     "weight": 5},
            {"term": "#GazSenegal",                    "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "infrastructures",
        "name": "Ministère des Infrastructures, des Transports terrestres et aériens",
        "short_name": "Infrastructures & Transports",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable des routes, autoroutes, transport en commun, chemin de fer, "
            "ports, aéroports et grands travaux d'infrastructure au Sénégal."
        ),
        "color": "#7C3AED",
        "icon": "🛣️",
        "keywords": [
            {"term": "APIX",                           "type": "institution", "weight": 4},
            {"term": "AGEROUTE",                       "type": "institution", "weight": 5},
            {"term": "AIBD",                           "type": "institution", "weight": 5},
            {"term": "Aéroport Blaise Diagne",         "type": "institution", "weight": 5},
            {"term": "TER",                            "type": "institution", "weight": 5},
            {"term": "Train Express Régional",         "type": "institution", "weight": 5},
            {"term": "BRT Dakar",                      "type": "institution", "weight": 5},
            {"term": "Port de Dakar",                  "type": "institution", "weight": 5},
            {"term": "DAKAR DEM DIKK",                 "type": "institution", "weight": 4},
            {"term": "autoroute Sénégal",              "type": "keyword",     "weight": 4},
            {"term": "routes Sénégal",                 "type": "keyword",     "weight": 4},
            {"term": "embouteillages Dakar",           "type": "keyword",     "weight": 4},
            {"term": "transport en commun",            "type": "keyword",     "weight": 4},
            {"term": "grève transporteurs",            "type": "keyword",     "weight": 5},
            {"term": "accident de la route",           "type": "keyword",     "weight": 5},
            {"term": "sécurité routière",              "type": "keyword",     "weight": 4},
            {"term": "infrastructure portuaire",       "type": "keyword",     "weight": 4},
            {"term": "#TERSenegal",                    "type": "hashtag",     "weight": 5},
            {"term": "#BRTDakar",                      "type": "hashtag",     "weight": 5},
            {"term": "#PortDeDakar",                   "type": "hashtag",     "weight": 4},
            {"term": "#AccidentRoute",                 "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "hydraulique",
        "name": "Ministère de l'Hydraulique et de l'Assainissement",
        "short_name": "Eau & Assainissement",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de l'accès à l'eau potable, de la gestion des ressources hydriques, "
            "de l'assainissement et de la lutte contre les inondations au Sénégal."
        ),
        "color": "#7C3AED",
        "icon": "💧",
        "keywords": [
            {"term": "SONES",                          "type": "institution", "weight": 5},
            {"term": "SDE",                            "type": "institution", "weight": 5},
            {"term": "ONAS",                           "type": "institution", "weight": 5},
            {"term": "eau potable Sénégal",            "type": "keyword",     "weight": 5},
            {"term": "pénurie d'eau",                  "type": "keyword",     "weight": 5},
            {"term": "coupure eau",                    "type": "keyword",     "weight": 5},
            {"term": "inondations Sénégal",            "type": "keyword",     "weight": 5},
            {"term": "inondations Dakar",              "type": "keyword",     "weight": 5},
            {"term": "assainissement",                 "type": "keyword",     "weight": 4},
            {"term": "eaux usées",                     "type": "keyword",     "weight": 4},
            {"term": "accès eau ruraux",               "type": "keyword",     "weight": 4},
            {"term": "hivernage",                      "type": "keyword",     "weight": 4},
            {"term": "Plan ORSEC",                     "type": "keyword",     "weight": 4},
            {"term": "#InondationsDakar",              "type": "hashtag",     "weight": 5},
            {"term": "#PenurieEau",                    "type": "hashtag",     "weight": 5},
            {"term": "#AssainissementSN",              "type": "hashtag",     "weight": 4},
        ],
    },

    # ══════════════════════════════════════════════════════════════════════════
    # PÔLE AGRICULTURE & ENVIRONNEMENT
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "agriculture",
        "name": "Ministère de l'Agriculture, de la Souveraineté alimentaire et de l'Élevage",
        "short_name": "Agriculture",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la politique agricole, de l'élevage, "
            "de la souveraineté alimentaire et du développement rural au Sénégal."
        ),
        "color": "#16A34A",
        "icon": "🌾",
        "keywords": [
            {"term": "SAED",                           "type": "institution", "weight": 5},
            {"term": "SODAGRI",                        "type": "institution", "weight": 4},
            {"term": "SODEFITEX",                      "type": "institution", "weight": 4},
            {"term": "ISRA",                           "type": "institution", "weight": 4},
            {"term": "arachide Sénégal",               "type": "keyword",     "weight": 5},
            {"term": "filière arachide",               "type": "keyword",     "weight": 5},
            {"term": "SONACOS",                        "type": "institution", "weight": 5},
            {"term": "campagne agricole",              "type": "keyword",     "weight": 5},
            {"term": "hivernage agricole",             "type": "keyword",     "weight": 4},
            {"term": "sécheresse Sénégal",             "type": "keyword",     "weight": 4},
            {"term": "souveraineté alimentaire",       "type": "keyword",     "weight": 5},
            {"term": "insécurité alimentaire",         "type": "keyword",     "weight": 5},
            {"term": "prix céréales",                  "type": "keyword",     "weight": 4},
            {"term": "riz Sénégal",                    "type": "keyword",     "weight": 4},
            {"term": "mil Sénégal",                    "type": "keyword",     "weight": 3},
            {"term": "élevage Sénégal",                "type": "keyword",     "weight": 4},
            {"term": "transhumance",                   "type": "keyword",     "weight": 3},
            {"term": "engrais subventionné",           "type": "keyword",     "weight": 4},
            {"term": "Programme PRACAS",               "type": "program",     "weight": 4},
            {"term": "#AgricultureSN",                 "type": "hashtag",     "weight": 4},
            {"term": "#SouveraineteAlimentaire",       "type": "hashtag",     "weight": 5},
            {"term": "#ArachideSenegal",               "type": "hashtag",     "weight": 5},
        ],
    },
    {
        "id": "environnement",
        "name": "Ministère de l'Environnement, du Développement durable et de la Transition écologique",
        "short_name": "Environnement",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la protection de l'environnement, de la gestion durable "
            "des ressources naturelles, de la lutte contre le changement climatique "
            "et de la reforestation au Sénégal."
        ),
        "color": "#16A34A",
        "icon": "🌿",
        "keywords": [
            {"term": "changement climatique Sénégal",  "type": "keyword",     "weight": 5},
            {"term": "érosion côtière",                "type": "keyword",     "weight": 5},
            {"term": "avancée de la mer",              "type": "keyword",     "weight": 5},
            {"term": "déforestation Sénégal",          "type": "keyword",     "weight": 5},
            {"term": "Grande Muraille Verte",          "type": "program",     "weight": 5},
            {"term": "reforestation",                  "type": "keyword",     "weight": 4},
            {"term": "pollution Dakar",                "type": "keyword",     "weight": 5},
            {"term": "déchets Sénégal",                "type": "keyword",     "weight": 4},
            {"term": "UCG",                            "type": "institution", "weight": 5},
            {"term": "Unité de Coordination Gestion",  "type": "institution", "weight": 4},
            {"term": "plastiques interdits",           "type": "keyword",     "weight": 4},
            {"term": "COP Sénégal",                    "type": "keyword",     "weight": 4},
            {"term": "biodiversité Sénégal",           "type": "keyword",     "weight": 4},
            {"term": "Parc national",                  "type": "keyword",     "weight": 3},
            {"term": "#ClimatSenegal",                 "type": "hashtag",     "weight": 5},
            {"term": "#ErosionCotiere",                "type": "hashtag",     "weight": 5},
            {"term": "#GrandeMurailleVerte",           "type": "hashtag",     "weight": 4},
            {"term": "#PollutionSN",                   "type": "hashtag",     "weight": 4},
        ],
    },
    {
        "id": "peche",
        "name": "Ministère de la Pêche et des Infrastructures maritimes",
        "short_name": "Pêche",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable du secteur de la pêche, de l'aquaculture, "
            "des infrastructures maritimes et de la gestion des ressources halieutiques au Sénégal."
        ),
        "color": "#16A34A",
        "icon": "🐟",
        "keywords": [
            {"term": "pêche Sénégal",                  "type": "keyword",     "weight": 5},
            {"term": "pêcheurs sénégalais",            "type": "keyword",     "weight": 5},
            {"term": "pêche artisanale",               "type": "keyword",     "weight": 5},
            {"term": "accords pêche UE",               "type": "keyword",     "weight": 5},
            {"term": "pêche illicite",                 "type": "keyword",     "weight": 5},
            {"term": "surpêche",                       "type": "keyword",     "weight": 5},
            {"term": "bateaux étrangers",              "type": "keyword",     "weight": 4},
            {"term": "thon Sénégal",                   "type": "keyword",     "weight": 4},
            {"term": "port de pêche",                  "type": "keyword",     "weight": 4},
            {"term": "Quai de pêche Dakar",            "type": "institution", "weight": 4},
            {"term": "aquaculture Sénégal",            "type": "keyword",     "weight": 4},
            {"term": "ressources halieutiques",        "type": "keyword",     "weight": 4},
            {"term": "#PecheSenegal",                  "type": "hashtag",     "weight": 5},
            {"term": "#AccordsPecheUE",                "type": "hashtag",     "weight": 5},
            {"term": "#PecheIllicite",                 "type": "hashtag",     "weight": 5},
        ],
    },

    # ══════════════════════════════════════════════════════════════════════════
    # PÔLE DIPLOMATIE
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "affaires_etrangeres",
        "name": "Ministère des Affaires étrangères et des Sénégalais de l'extérieur",
        "short_name": "Affaires étrangères",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable de la politique étrangère du Sénégal, "
            "des relations diplomatiques, de la diaspora sénégalaise "
            "et de la coopération internationale."
        ),
        "color": "#0369A1",
        "icon": "🌍",
        "keywords": [
            {"term": "diplomatie sénégalaise",         "type": "keyword",     "weight": 5},
            {"term": "CEDEAO",                         "type": "institution", "weight": 5},
            {"term": "Union africaine",                "type": "institution", "weight": 4},
            {"term": "AES",                            "type": "institution", "weight": 5},
            {"term": "Alliance des États du Sahel",    "type": "institution", "weight": 5},
            {"term": "Diomaye Faye",                   "type": "person",      "weight": 5},
            {"term": "Ousmane Sonko",                  "type": "person",      "weight": 5},
            {"term": "Pan-Africanisme",                "type": "keyword",     "weight": 4},
            {"term": "souveraineté Sénégal",           "type": "keyword",     "weight": 5},
            {"term": "rupture diplomatique",           "type": "keyword",     "weight": 5},
            {"term": "relations France Sénégal",       "type": "keyword",     "weight": 5},
            {"term": "bases militaires françaises",    "type": "keyword",     "weight": 5},
            {"term": "retrait armée française",        "type": "keyword",     "weight": 5},
            {"term": "CFA franc",                      "type": "keyword",     "weight": 5},
            {"term": "diaspora sénégalaise",           "type": "keyword",     "weight": 4},
            {"term": "transferts de fonds",            "type": "keyword",     "weight": 4},
            {"term": "coopération internationale",     "type": "keyword",     "weight": 4},
            {"term": "#DiploatieSN",                   "type": "hashtag",     "weight": 4},
            {"term": "#SouveraineteAfrique",           "type": "hashtag",     "weight": 5},
            {"term": "#RelationsFranceSenegal",        "type": "hashtag",     "weight": 5},
            {"term": "#CEDEAO",                        "type": "hashtag",     "weight": 5},
            {"term": "#DiasporaSN",                    "type": "hashtag",     "weight": 4},
        ],
    },

    # ══════════════════════════════════════════════════════════════════════════
    # PÔLE TOURISME
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "tourisme",
        "name": "Ministère du Tourisme et de l'Artisanat",
        "short_name": "Tourisme",
        "level": "ministry",
        "parent_id": "primature",
        "minister_name": "",
        "description": (
            "Responsable du développement du tourisme, de la valorisation de l'artisanat, "
            "de la promotion de la destination Sénégal "
            "et du développement de l'hôtellerie."
        ),
        "color": "#9333EA",
        "icon": "🏖️",
        "keywords": [
            {"term": "SAPCO",                          "type": "institution", "weight": 4},
            {"term": "tourisme Sénégal",               "type": "keyword",     "weight": 5},
            {"term": "tourisme Dakar",                 "type": "keyword",     "weight": 4},
            {"term": "Saly Portudal",                  "type": "keyword",     "weight": 4},
            {"term": "Casamance tourisme",             "type": "keyword",     "weight": 4},
            {"term": "Saint-Louis tourisme",           "type": "keyword",     "weight": 4},
            {"term": "Ziguinchor",                     "type": "keyword",     "weight": 3},
            {"term": "artisanat sénégalais",           "type": "keyword",     "weight": 4},
            {"term": "hôtel Sénégal",                  "type": "keyword",     "weight": 3},
            {"term": "industrie touristique",          "type": "keyword",     "weight": 4},
            {"term": "visiteurs étrangers",            "type": "keyword",     "weight": 3},
            {"term": "Festival international Dakar",   "type": "keyword",     "weight": 4},
            {"term": "DSTKE",                          "type": "institution", "weight": 3},
            {"term": "#TourismeSenegal",               "type": "hashtag",     "weight": 5},
            {"term": "#DestinationSenegal",            "type": "hashtag",     "weight": 5},
            {"term": "#ArtisanatSN",                   "type": "hashtag",     "weight": 4},
        ],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# SEED FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

async def seed_ministries() -> None:
    """
    Insère/met à jour la hiérarchie et les mots-clés dans la DB.
    Idempotent : ne crée que ce qui n'existe pas encore.
    """
    from sqlalchemy import update, delete

    async with AsyncSessionLocal() as db:
        # ── 0. Migration : supprimer les nœuds pôle obsolètes ────────────────
        OBSOLETE_POLES = [
            "pole_numerique", "pole_economique", "pole_social", "pole_securite",
            "pole_infra", "pole_agri", "pole_diplo", "pole_tourisme",
        ]
        for pole_id in OBSOLETE_POLES:
            # Rattacher les enfants à primature avant de supprimer
            await db.execute(
                update(Ministry)
                .where(Ministry.parent_id == pole_id)
                .values(parent_id="primature")
            )
            # Supprimer le nœud pôle
            await db.execute(delete(Ministry).where(Ministry.id == pole_id))
        await db.flush()

        # ── 1. Hiérarchie ────────────────────────────────────────────────────
        for node in HIERARCHY:
            result = await db.execute(select(Ministry).where(Ministry.id == node["id"]))
            existing = result.scalar_one_or_none()
            if not existing:
                db.add(Ministry(
                    id=node["id"],
                    name=node["name"],
                    short_name=node["short_name"],
                    level=node["level"],
                    parent_id=node.get("parent_id"),
                    color=node["color"],
                    icon=node["icon"],
                    active=True,
                ))
                logger.info(f"[Seeder] Créé nœud: {node['id']}")

        # ── 2. Ministères + mots-clés ────────────────────────────────────────
        for m in MINISTRIES:
            result = await db.execute(select(Ministry).where(Ministry.id == m["id"]))
            existing = result.scalar_one_or_none()
            if not existing:
                db.add(Ministry(
                    id=m["id"],
                    name=m["name"],
                    short_name=m["short_name"],
                    level=m["level"],
                    parent_id=m.get("parent_id"),
                    minister_name=m.get("minister_name", ""),
                    description=m.get("description", ""),
                    color=m["color"],
                    icon=m["icon"],
                    active=True,
                ))
                logger.info(f"[Seeder] Créé ministère: {m['id']}")

            await db.flush()

            # Insérer les mots-clés (ignorer si déjà présents)
            for kw in m["keywords"]:
                result = await db.execute(
                    select(MinistryKeyword).where(
                        MinistryKeyword.ministry_id == m["id"],
                        MinistryKeyword.term == kw["term"],
                    )
                )
                if not result.scalar_one_or_none():
                    db.add(MinistryKeyword(
                        ministry_id=m["id"],
                        term=kw["term"],
                        term_type=kw["type"],
                        weight=kw["weight"],
                        language="FR",
                        active=True,
                    ))

            logger.info(f"[Seeder] {m['id']}: {len(m['keywords'])} mots-clés chargés")

        # ── 3. Associer toutes les sources Presse à tous les ministères ───────
        result = await db.execute(
            select(Source).where(Source.platform == "Presse", Source.active == True)
        )
        presse_sources = result.scalars().all()

        for m in MINISTRIES:
            for source in presse_sources:
                result = await db.execute(
                    select(MinistrySource).where(
                        MinistrySource.ministry_id == m["id"],
                        MinistrySource.source_id == source.id,
                    )
                )
                if not result.scalar_one_or_none():
                    db.add(MinistrySource(
                        ministry_id=m["id"],
                        source_id=source.id,
                        relevance=3,
                        active=True,
                    ))

        await db.commit()
        logger.info(
            f"[Seeder] Initialisation terminée — "
            f"{len(HIERARCHY)} nœuds hiérarchiques, "
            f"{len(MINISTRIES)} ministères."
        )
