# SenCity — Plateforme de Surveillance Environnementale Urbaine

> Projet d'examen — Architecture Orientée Services (SOA)
> Université Alioune Diop de Bambey · UFR SATIC · Master 1 SI/SR · 2026

---

## Table des matières

1. [Contexte et problématique](#1-contexte-et-problématique)
2. [Solution proposée](#2-solution-proposée)
3. [Architecture SOA](#3-architecture-soa)
4. [Les 7 principes SOA appliqués](#4-les-7-principes-soa-appliqués)
5. [Structure du projet](#5-structure-du-projet)
6. [Services et contrats](#6-services-et-contrats)
7. [Base de données PostgreSQL](#7-base-de-données-postgresql)
8. [Composition de services](#8-composition-de-services)
9. [Registre de services](#9-registre-de-services)
10. [Dashboard web temps réel](#10-dashboard-web-temps-réel)
11. [Conteneurisation Docker](#11-conteneurisation-docker)
12. [Installation et démarrage](#12-installation-et-démarrage)
13. [Guide de démonstration](#13-guide-de-démonstration)
14. [Stack technique](#14-stack-technique)

---

## 1. Contexte et problématique

Les grandes villes africaines comme **Dakar** font face à des défis environnementaux croissants :

- **Pollution de l'air** — particules fines, émissions en hausse dans les zones urbaines denses
- **Inondations** — bassins de rétention saturés lors des saisons des pluies
- **Canicules urbaines** — températures extrêmes dans les quartiers densément peuplés
- **Nuisances sonores** — axes routiers et zones industrielles sans monitoring

Ces problèmes existent sans infrastructure centralisée permettant aux gestionnaires urbains de **détecter**, **réagir** et **anticiper** en temps réel.

---

## 2. Solution proposée

**SenCity** est une plateforme IoT de surveillance environnementale urbaine construite selon les principes de l'**Architecture Orientée Services (SOA)**.

Des capteurs déployés dans 5 quartiers de Dakar mesurent en continu :

| Indicateur | Unité | Seuil Alerte | Seuil Critique |
|---|---|---|---|
| Température | °C | > 38 | > 42 |
| Humidité | % | > 85 | > 95 |
| Qualité de l'air (AQI) | indice | > 100 | > 150 |
| Niveau sonore | dB | > 70 | > 85 |
| Niveau d'eau | cm | > 50 | > 80 |

Les données remontent vers la plateforme, sont analysées automatiquement, et des alertes visuelles sont déclenchées sur le dashboard dès qu'un seuil est franchi.

---

## 3. Architecture SOA

```
┌──────────────────────────────────────────────────────────────────┐
│                      CLIENTS CONSOMMATEURS                       │
│                                                                  │
│        ┌─────────────────────────┐                               │
│        │   Dashboard React       │                               │
│        │   Vite + Leaflet        │                               │
│        │   Chart.js · port 3000  │                               │
│        └────────────┬────────────┘                               │
│                     │ HTTP/REST                                   │
└─────────────────────┼────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                BUS DE SERVICES — API GATEWAY                     │
│                     Nginx · port 8080                            │
│                                                                  │
│  /api/registry        →  Registre SOA des services              │
│  /api/surveillance/*  →  Service Surveillance                    │
│  /api/incidents/*     →  Service Incidents                       │
│  /api/reporting/*     →  Service Reporting                       │
└──────┬───────────────────────┬──────────────────────┬───────────┘
       │                       │                      │
       ▼                       ▼                      ▼
┌─────────────┐    ┌────────────────────┐   ┌────────────────────┐
│  Service    │◄───│  Service           │   │  Service           │
│ Surveillance│    │  Incidents         │   │  Reporting         │
│             │◄───│                    │   │                    │
│ FastAPI     │    │  FastAPI           │   │  FastAPI           │
│ port :8001  │    │  port :8002        │   │  port :8003        │
└─────────────┘    └────────────────────┘   └────────────────────┘
       │                   │                        │
       └───────────────────┴────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  BASE DE DONNÉES PARTAGÉE                        │
│                  PostgreSQL 16 · port 5432                       │
│                                                                  │
│  schéma : surveillance │ schéma : incidents │ schéma : reporting │
└──────────────────────────────────────────────────────────────────┘
                           ▲
                           │ POST /mesures toutes les 5s
                    ┌──────────────┐
                    │  Simulateur  │
                    │  IoT (PHP)   │
                    └──────────────┘
```

### Composition de services

```
POST /api/incidents/verifier
        │
        ▼
Service Incidents appelle :
GET http://surveillance:8001/mesures/dernieres
        │
        ▼
Reçoit les mesures des capteurs
        │
        ▼
Applique les règles (seuils) de incidents.regles
        │
        ├── Seuil OK → aucune action
        └── Seuil dépassé → crée incident en DB
                           → alerte visuelle sur dashboard
```

---

## 4. Les 7 principes SOA appliqués

### 1. Contrat standardisé
Chaque service publie un contrat **OpenAPI 3.0** accessible via `/api-docs` (redirige vers Swagger UI). Ce contrat définit formellement les endpoints, les types de données, les codes de retour. Aucune communication n'est possible sans passer par ce contrat.

### 2. Couplage faible
Les services Incidents et Reporting ne connaissent du service Surveillance que son **URL et son contrat HTTP**. Ils ne partagent aucun code, aucune librairie, aucune logique interne. Si l'implémentation change, les autres services ne sont pas affectés tant que le contrat est respecté.

### 3. Abstraction
Les clients ne connaissent que l'adresse de la Gateway : `http://localhost:8080`. Ils ignorent combien de services existent, sur quels ports ils tournent, avec quel langage ils sont codés. La Gateway est l'unique point d'entrée — c'est l'ESB simplifié.

### 4. Réutilisabilité
Le Service Surveillance est consommé par **trois consommateurs différents** sans modification : le Service Incidents (composition), le Service Reporting (composition), et directement par le Dashboard React via la Gateway. Un même service, plusieurs consommateurs.

### 5. Autonomie
Chaque service tourne dans son **propre conteneur Docker** avec ses propres variables d'environnement et son propre processus uvicorn. Il peut être redémarré ou mis à jour indépendamment sans affecter les autres.

### 6. Sans état (Stateless)
Chaque requête HTTP est **complète et autonome**. Aucun état de session n'est maintenu côté serveur. Toutes les informations nécessaires sont contenues dans la requête elle-même. Cela permet la scalabilité horizontale (4 workers uvicorn par service).

### 7. Découvrabilité
La Gateway expose un endpoint **`/api/registry`** — le registre SOA. Il liste en temps réel les services disponibles, leurs URLs de contrat OpenAPI, leurs dépendances et leur statut. Un consommateur peut interroger ce registre pour découvrir dynamiquement les services.

---

## 5. Structure du projet

```
projet_examen_SOA/
│
├── docker-compose.yml              # Orchestration complète (7 conteneurs)
├── README.md
│
├── gateway/
│   └── nginx.conf                  # Bus de services + registre SOA intégré
│
├── database/
│   └── init.sql                    # Schémas PostgreSQL + utilisateurs + données initiales
│
├── services/
│   ├── surveillance/               # Service Surveillance (FastAPI)
│   │   ├── Dockerfile              # python:3.12-slim + uvicorn 4 workers
│   │   ├── main.py                 # Endpoints FastAPI
│   │   ├── requirements.txt
│   │   └── openapi.yaml            # Contrat OpenAPI 3.0 (référence)
│   │
│   ├── incidents/                  # Service Incidents (FastAPI)
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── openapi.yaml
│   │
│   └── reporting/                  # Service Reporting (FastAPI)
│       ├── Dockerfile
│       ├── main.py
│       ├── requirements.txt
│       └── openapi.yaml
│
├── simulateur/                     # Injecteur de données IoT (PHP CLI)
│   ├── Dockerfile
│   └── simulate.php                # Envoie POST /mesures toutes les 5s
│
└── dashboard/                      # Client web React (Vite)
    ├── Dockerfile                  # Multi-stage build → nginx
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx                 # Layout + polling 5s + toasts d'alerte
        ├── App.css
        ├── components/
        │   ├── KpiCards.jsx        # 5 indicateurs en temps réel (vert/orange/rouge)
        │   ├── MapQuartiers.jsx    # Carte Leaflet + marqueurs pulsants
        │   ├── GraphiqueTemps.jsx  # Courbes Chart.js par type de capteur
        │   ├── ListeIncidents.jsx  # Incidents actifs + résolution
        │   └── RegistreServices.jsx
        └── services/
            └── api.js              # Appels REST centralisés vers la Gateway
```

---

## 6. Services et contrats

### Service Surveillance — `http://localhost:8080/api/surveillance`

**Responsabilité** : Ingestion et consultation des mesures environnementales. C'est le service **fournisseur de données** consommé par tous les autres.

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Disponibilité du service |
| `POST` | `/mesures` | Ingérer une mesure capteur |
| `GET` | `/mesures` | Lister les mesures (`?quartier=&type=&depuis=&limit=`) |
| `GET` | `/mesures/dernieres` | Dernière mesure par capteur et par type |
| `GET` | `/mesures/{id}` | Détail d'une mesure |
| `GET` | `/capteurs` | Catalogue des capteurs enregistrés |
| `GET` | `/capteurs/{id}` | Statut et dernières mesures d'un capteur |
| `GET` | `/api-docs` | Swagger UI (contrat OpenAPI) |

**Exemple de mesure ingérée :**
```json
{
  "capteur_id": "CAP-PLATEAU-001",
  "quartier":   "Plateau",
  "type":       "temperature",
  "valeur":     39.2,
  "unite":      "°C"
}
```

**Format de réponse standard :**
```json
{
  "success": true,
  "data": {
    "id": 142,
    "capteur_id": "CAP-PLATEAU-001",
    "quartier": "Plateau",
    "type": "temperature",
    "valeur": 39.2,
    "unite": "°C",
    "timestamp": "2026-06-15T14:32:00+00:00"
  }
}
```

---

### Service Incidents — `http://localhost:8080/api/incidents`

**Responsabilité** : Surveillance des seuils, génération d'incidents, gestion des abonnements. Ce service **compose** le Service Surveillance — il l'appelle en interne via HTTP pour obtenir les dernières mesures.

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Disponibilité du service |
| `GET` | `/incidents` | Liste des incidents (`?statut=actif&quartier=&severite=`) |
| `GET` | `/incidents/{id}` | Détail d'un incident |
| `PUT` | `/incidents/{id}/resoudre` | Marquer un incident comme résolu |
| `GET` | `/regles` | Consulter les seuils de détection |
| `PUT` | `/regles/{type}` | Modifier un seuil dynamiquement |
| `POST` | `/abonnements` | S'abonner aux notifications (token push) |
| `DELETE` | `/abonnements/{token}` | Se désabonner |
| `POST` | `/verifier` | Vérifier les seuils sur les dernières mesures |
| `GET` | `/api-docs` | Swagger UI (contrat OpenAPI) |

**Exemple d'incident généré :**
```json
{
  "id": 38,
  "capteur_id": "CAP-PLATEAU-001",
  "quartier": "Plateau",
  "type": "temperature",
  "valeur_mesuree": 43.1,
  "seuil_depasse": 42.0,
  "severite": "critique",
  "statut": "actif",
  "message": "Critique temperature détecté(e) à Plateau : 43.1 °C (seuil: 42.0)",
  "cree_le": "2026-06-15T14:32:00+00:00"
}
```

---

### Service Reporting — `http://localhost:8080/api/reporting`

**Responsabilité** : Agrégation, statistiques et rapports décisionnels. Ce service **compose** également le Service Surveillance pour construire ses analyses sans dupliquer les données.

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Disponibilité du service |
| `GET` | `/rapport/temps-reel` | État actuel de tous les quartiers |
| `GET` | `/rapport/statistiques` | Moyennes, min/max (`?periode=24h&quartier=`) |
| `GET` | `/rapport/historique` | Historique sur une période (`?debut=&quartier=&type=`) |
| `GET` | `/rapport/tendances` | Comparaison 24h vs 24h précédentes |
| `GET` | `/rapport/export` | Export CSV (`?periode=7j&quartier=`) |
| `GET` | `/api-docs` | Swagger UI (contrat OpenAPI) |

---

## 7. Base de données PostgreSQL

En SOA, les services partagent **une seule instance de base de données** mais chacun possède son **schéma logique isolé**. Un service n'accède jamais directement aux tables d'un autre — il passe obligatoirement par son contrat HTTP.

### Schémas et isolation

```
PostgreSQL (sencity)
├── schema: surveillance  → svc_surveillance (accès exclusif)
│   ├── capteurs
│   └── mesures
│
├── schema: incidents     → svc_incidents (accès exclusif)
│   ├── incidents
│   ├── regles
│   └── abonnements
│
└── schema: reporting     → svc_reporting (accès exclusif)
    └── rapports_cache
```

### Tables principales

```sql
-- Mesures des capteurs IoT
CREATE TABLE surveillance.mesures (
    id         SERIAL PRIMARY KEY,
    capteur_id VARCHAR(50) NOT NULL,
    quartier   VARCHAR(100) NOT NULL,
    type       VARCHAR(50) NOT NULL,   -- temperature, humidite, aqi, bruit, eau
    valeur     DECIMAL(10,2) NOT NULL,
    unite      VARCHAR(20),
    timestamp  TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents détectés automatiquement
CREATE TABLE incidents.incidents (
    id             SERIAL PRIMARY KEY,
    capteur_id     VARCHAR(50) NOT NULL,
    quartier       VARCHAR(100) NOT NULL,
    type           VARCHAR(50) NOT NULL,
    valeur_mesuree DECIMAL(10,2) NOT NULL,
    seuil_depasse  DECIMAL(10,2) NOT NULL,
    severite       VARCHAR(20) NOT NULL,   -- warning, critique
    statut         VARCHAR(20) DEFAULT 'actif',
    message        TEXT,
    cree_le        TIMESTAMPTZ DEFAULT NOW(),
    resolu_le      TIMESTAMPTZ
);

-- Règles de détection (modifiables via API)
CREATE TABLE incidents.regles (
    type           VARCHAR(50) PRIMARY KEY,
    seuil_warning  DECIMAL(10,2) NOT NULL,
    seuil_critique DECIMAL(10,2) NOT NULL,
    unite          VARCHAR(20)
);
```

---

## 8. Composition de services

La **composition de services** est un principe clé de la SOA : un service orchestre d'autres services via leur contrat HTTP pour accomplir un processus métier complexe.

### Incidents compose Surveillance

```
POST /api/incidents/verifier
        │
        ▼
Service Incidents (port 8002)
        │
        └─► GET http://surveillance:8001/mesures/dernieres
                    │
                    ▼
            Retourne dernières mesures par capteur
                    │
        ◄───────────┘
        │
        ▼
Charge les règles depuis incidents.regles
        │
        ├── valeur ≤ seuil_warning   → aucun incident
        ├── valeur > seuil_warning   → incident "warning"
        └── valeur > seuil_critique  → incident "critique"
                    │
                    ▼
            INSERT INTO incidents.incidents
```

### Reporting compose Surveillance

```
GET /api/reporting/rapport/statistiques?periode=24h
        │
        ▼
Service Reporting (port 8003)
        │
        └─► GET http://surveillance:8001/mesures?limit=1000&depuis=<timestamp>
                    │
                    ▼
            Calcule moyennes, min, max par quartier et par type
                    │
        ◄───────────┘
        │
        ▼
Retourne le rapport agrégé au client
```

---

## 9. Registre de services

Le registre est accessible sur `http://localhost:8080/api/registry`. Il est défini statiquement dans la Gateway Nginx et liste les 3 services avec leurs métadonnées SOA.

```json
{
  "registry": {
    "version": "1.0.0",
    "description": "SenCity — Registre des services SOA",
    "services": [
      {
        "id":          "surveillance",
        "nom":         "Service de Surveillance",
        "description": "Collecte et exposition des mesures environnementales",
        "url_interne": "http://surveillance:8001",
        "contrat":     "http://localhost:8080/api/surveillance/api-docs",
        "health":      "http://localhost:8080/api/surveillance/health",
        "statut":      "disponible",
        "version":     "1.0.0",
        "dependances": [],
        "endpoints":   7
      },
      {
        "id":          "incidents",
        "nom":         "Service de Gestion des Incidents",
        "dependances": ["surveillance"],
        "endpoints":   9
      },
      {
        "id":          "reporting",
        "nom":         "Service de Reporting",
        "dependances": ["surveillance"],
        "endpoints":   6
      }
    ]
  }
}
```

---

## 10. Dashboard web temps réel

Le dashboard React consomme les 3 services via la Gateway et se rafraîchit automatiquement toutes les **5 secondes**.

### Fonctionnalités

**KPI Cards** — 5 indicateurs en temps réel avec code couleur :
- Vert : valeur normale
- Orange : seuil d'alerte dépassé
- Rouge clignotant : seuil critique dépassé

**Carte interactive** (Leaflet) — 5 quartiers de Dakar avec marqueurs colorés :
- Zones critiques : marqueurs avec anneaux pulsants animés
- Popup au clic : détail de toutes les mesures du quartier

**Graphiques** (Chart.js) — courbes d'évolution des 60 dernières mesures par type de capteur, par quartier

**Liste des incidents** — incidents actifs avec sévérité, possibilité de résolution manuelle, filtrage par statut

**Toasts de notification** — alerte visuelle automatique en bas à droite dès qu'un nouvel incident est détecté

**Indicateur live** — point vert clignotant dans le header avec l'heure de la dernière synchronisation

**Registre SOA** — état des 3 services en temps réel

**Accès :** `http://localhost:3000`

---

## 11. Conteneurisation Docker

### Conteneurs

| Conteneur | Image de base | Port exposé | Rôle |
|---|---|---|---|
| `sc-postgres` | `postgres:16-alpine` | `5432` | Base de données partagée |
| `sc-gateway` | `nginx:alpine` | `8080` | Bus de services / ESB |
| `sc-surveillance` | `python:3.12-slim` | interne `:8001` | Service Surveillance (4 workers) |
| `sc-incidents` | `python:3.12-slim` | interne `:8002` | Service Incidents (4 workers) |
| `sc-reporting` | `python:3.12-slim` | interne `:8003` | Service Reporting (4 workers) |
| `sc-dashboard` | `nginx:alpine` (build node) | `3000` | Dashboard React (statique) |
| `sc-simulateur` | `php:8.3-cli-alpine` | — | Injecteur IoT (1 mesure/5s) |

### Dockerfile des services Python (même base)

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl libpq-dev gcc \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
```

### Ordre de démarrage (depends_on)

```
postgres (healthy)
    └─► surveillance (healthy)
            └─► incidents (healthy)
            └─► reporting (healthy)
                    └─► gateway
                            └─► simulateur
```

---

## 12. Installation et démarrage

### Prérequis

- Docker Engine + Docker Compose v2
- Git

### Démarrage

```bash
# 1. Cloner le projet
git clone <repo-url>
cd projet_examen_SOA

# 2. Démarrer tous les conteneurs
docker compose up --build -d

# 3. Vérifier que tout tourne (attendre ~20s)
docker compose ps
```

### URLs d'accès

| URL | Description |
|---|---|
| `http://localhost:3000` | Dashboard React |
| `http://localhost:8080/api/registry` | Registre SOA |
| `http://localhost:8080/api/surveillance/health` | Santé surveillance |
| `http://localhost:8080/api/incidents/health` | Santé incidents |
| `http://localhost:8080/api/reporting/health` | Santé reporting |
| `http://localhost:8080/api/surveillance/api-docs` | Swagger UI surveillance |
| `http://localhost:8080/api/incidents/api-docs` | Swagger UI incidents |
| `http://localhost:8080/api/reporting/api-docs` | Swagger UI reporting |

### Commandes utiles

```bash
# Logs d'un service
docker compose logs -f surveillance

# Logs du simulateur (voir les mesures envoyées)
docker compose logs -f simulateur

# Redémarrer un service
docker compose restart incidents

# Arrêter un service (test de résilience)
docker compose stop surveillance

# Tout arrêter (conserve les données)
docker compose down

# Tout arrêter + supprimer les données
docker compose down -v
```

---

## 13. Guide de démonstration

### Étape 1 — Démarrage

```bash
docker compose up --build -d
docker compose ps
```
Montrer les 7 conteneurs qui démarrent, les healthchecks qui passent, l'ordre de démarrage respecté.

### Étape 2 — Registre SOA (découvrabilité)

```bash
curl -s http://localhost:8080/api/registry | python3 -m json.tool
```
Montrer les 3 services, leurs dépendances, leurs contrats OpenAPI.

### Étape 3 — Contrats OpenAPI (contrat standardisé)

Ouvrir dans le navigateur :
- `http://localhost:8080/api/surveillance/api-docs` → Swagger UI interactif
- `http://localhost:8080/api/incidents/api-docs`

### Étape 4 — Dashboard temps réel

Ouvrir `http://localhost:3000`. Montrer :
- Les KPI cards qui se mettent à jour toutes les 5s
- La carte avec les quartiers colorés
- Les graphiques d'évolution

### Étape 5 — Composition de services

```bash
curl -s -X POST http://localhost:8080/api/incidents/verifier | python3 -m json.tool
```
Le Service Incidents appelle le Service Surveillance en interne — c'est la composition SOA.

### Étape 6 — Injection d'une alerte critique

```bash
curl -s -X POST http://localhost:8080/api/surveillance/mesures \
  -H "Content-Type: application/json" \
  -d '{
    "capteur_id": "CAP-PLATEAU-001",
    "quartier":   "Plateau",
    "type":       "temperature",
    "valeur":     45.0,
    "unite":      "°C"
  }'

# Déclencher la vérification
curl -s -X POST http://localhost:8080/api/incidents/verifier
```
Observer le toast d'alerte et le marqueur rouge pulsant sur la carte.

### Étape 7 — Résilience (autonomie des services)

```bash
# Arrêter le service surveillance
docker compose stop surveillance

# Les autres services répondent toujours
curl -s http://localhost:8080/api/incidents/health
# → {"success": true, "data": {"status": "disponible", ...}}

# Relancer
docker compose start surveillance
```

---

## 14. Stack technique

| Couche | Technologie | Justification SOA |
|---|---|---|
| Services REST | Python 3.12 + FastAPI + uvicorn | Async, multi-workers, contrats auto-générés |
| Contrats | OpenAPI 3.0 (Swagger UI auto) | Standard industriel, généré automatiquement par FastAPI |
| Bus de services | Nginx (ESB léger) | Routing, DNS dynamique, registre intégré |
| Base de données | PostgreSQL 16 (schémas isolés) | Base partagée SOA, isolation par schéma et utilisateur |
| Conteneurisation | Docker + Docker Compose v2 | Autonomie des services, démarrage en 1 commande |
| Client web | React (Vite) + Leaflet + Chart.js | SPA temps réel, polling 5s, alertes visuelles |
| Simulateur IoT | PHP CLI | Génère des mesures réalistes toutes les 5 secondes |

---

*SenCity — Projet SOA · Master 1 SI/SR · UADB SATIC · 2026*
