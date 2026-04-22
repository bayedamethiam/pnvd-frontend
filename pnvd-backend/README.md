# PNVD Backend — Guide de déploiement

## Structure du projet

```
pnvd-backend/
├── main.py                  # Point d'entrée FastAPI + scheduler
├── requirements.txt         # Dépendances Python
├── .env.example             # Variables d'environnement (à copier en .env)
├── core/
│   ├── config.py            # Configuration centralisée
│   ├── database.py          # Modèles SQLAlchemy + init DB
│   └── nlp.py               # Analyse NLP (local + Claude API)
├── collectors/
│   ├── rss.py               # Collecteurs RSS, GDELT, Reddit, YouTube, Twitter
│   └── pipeline.py          # Orchestration, déduplication, alertes
└── api/
    └── routes.py            # Toutes les routes REST
```

---

## Installation (5 minutes)

### 1. Prérequis
```bash
python --version   # Python 3.11+ requis
```

### 2. Installation
```bash
cd pnvd-backend
python -m venv venv
source venv/bin/activate          # Linux/Mac
# ou : venv\Scripts\activate      # Windows

pip install -r requirements.txt
```

### 3. Configuration
```bash
cp .env .env
nano .env   # ou ouvrez avec votre éditeur
```

Seul `SECRET_KEY` est obligatoire. Tout le reste est optionnel.

### 4. Lancement
```bash
python main.py
# ou
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Le serveur démarre sur **http://localhost:8000**  
Documentation interactive : **http://localhost:8000/docs**

---

## Ce qui se passe au démarrage

1. La base de données SQLite `pnvd.db` est créée automatiquement
2. Les 12 sources RSS sénégalaises sont enregistrées
3. 15 mots-clés par défaut sont insérés
4. Une première collecte démarre immédiatement
5. Le scheduler lance une collecte toutes les 5 minutes

---

## Routes API principales

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/articles` | Liste des articles (filtrable) |
| GET | `/api/v1/stats/dashboard` | KPIs complets pour le dashboard |
| GET | `/api/v1/stats/topics` | Topics tendance |
| GET | `/api/v1/stats/keywords` | Stats par mot-clé |
| GET | `/api/v1/sources` | État des sources |
| PATCH | `/api/v1/sources/{id}/toggle` | Activer/désactiver une source |
| GET | `/api/v1/keywords` | Liste des mots-clés |
| POST | `/api/v1/keywords` | Ajouter un mot-clé |
| DELETE | `/api/v1/keywords/{term}` | Supprimer un mot-clé |
| GET | `/api/v1/alerts` | Liste des alertes |
| POST | `/api/v1/collect/trigger` | Collecte manuelle |
| POST | `/api/v1/nlp/analyze` | Analyse NLP d'un texte |
| GET | `/api/v1/health` | Santé du serveur |

### Exemples de requêtes

```bash
# Dernières 24h, articles négatifs
curl "http://localhost:8000/api/v1/articles?sentiment=negatif&hours=24"

# Recherche sur "grève"
curl "http://localhost:8000/api/v1/articles?search=grève"

# Stats dashboard
curl "http://localhost:8000/api/v1/stats/dashboard?hours=48"

# Ajouter un mot-clé
curl -X POST "http://localhost:8000/api/v1/keywords" \
  -H "Content-Type: application/json" \
  -d '{"term": "Sangomar", "active": true}'

# Déclencher une collecte manuelle
curl -X POST "http://localhost:8000/api/v1/collect/trigger"

# Analyser un texte avec NLP
curl -X POST "http://localhost:8000/api/v1/nlp/analyze" \
  -H "Content-Type: application/json" \
  -d '{"title": "Grève à Dakar", "text": "Les transporteurs ont déclaré une grève générale..."}'
```

---

## Activer les sources payantes

### YouTube (gratuit — 10 000 req/jour)
1. Allez sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créez un projet → Activez **YouTube Data API v3**
3. Identifiants → Créer une clé API
4. Ajoutez dans `.env` : `YOUTUBE_API_KEY=AIza...`

### X/Twitter (~100$/mois)
1. [developer.twitter.com](https://developer.twitter.com) → API Basic
2. Ajoutez : `TWITTER_BEARER_TOKEN=AAAA...`

### Claude NLP automatisé
1. [console.anthropic.com](https://console.anthropic.com) → Créer une clé
2. Ajoutez : `ANTHROPIC_API_KEY=sk-ant-...`
3. Sans cette clé, le NLP local (heuristiques) s'applique automatiquement

---

## Connecter le frontend PNVD

Remplacez les données statiques dans `pnvd-senegal-v5.jsx` par des appels API :

```javascript
// Exemple : charger le dashboard
const response = await fetch('http://localhost:8000/api/v1/stats/dashboard?hours=24');
const data = await response.json();
// data.total_mentions, data.sentiment, data.regions, data.hourly_volume...

// Charger les articles en temps réel
const articles = await fetch('http://localhost:8000/api/v1/articles?limit=50');
```

---

## Déploiement en production

### Option A — VPS simple (10€/mois, ex: DigitalOcean, Hetzner)

```bash
# Installer sur le serveur
git clone ... && cd pnvd-backend
pip install -r requirements.txt
cp .env .env && nano .env

# Lancer en arrière-plan avec systemd
sudo nano /etc/systemd/system/pnvd.service
```

```ini
[Unit]
Description=PNVD Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/pnvd-backend
Environment=PATH=/home/ubuntu/pnvd-backend/venv/bin
ExecStart=/home/ubuntu/pnvd-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pnvd && sudo systemctl start pnvd
sudo systemctl status pnvd
```

### Option B — Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t pnvd-backend .
docker run -d -p 8000:8000 --env-file .env -v $(pwd)/pnvd.db:/app/pnvd.db pnvd-backend
```

---

## Volumétrie attendue

| Source | Articles/cycle | Articles/jour |
|--------|---------------|---------------|
| RSS (12 sources) | 50-150 | 700-2000 |
| GDELT | 15-30 | 200-400 |
| Reddit | 5-15 | 70-200 |
| YouTube | 0-20* | 0-280* |
| Twitter | 0-50* | 0-700* |

*si clé API configurée

**Total estimé sans APIs payantes : 1000-2600 articles/jour**
