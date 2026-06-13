# SenCity — Plateforme de Surveillance Environnementale Urbaine

> Projet d'examen — Architecture Orientée Services (AOS/SOA)
> Université Alioune Diop de Bambey · UFR SATIC · Master 1 SI/SR

---

## Table des matières

1. [Contexte et problématique](#1-contexte-et-problématique)
2. [Solution proposée](#2-solution-proposée)
3. [Architecture SOA](#3-architecture-soa)
4. [Les 7 principes SOA appliqués](#4-les-7-principes-soa-appliqués)
5. [Structure du projet](#5-structure-du-projet)
6. [Services et contrats](#6-services-et-contrats)
7. [Base de données partagée PostgreSQL](#7-base-de-données-partagée-postgresql)
8. [Composition de services](#8-composition-de-services)
9. [Registre de services](#9-registre-de-services)
10. [Clients consommateurs](#10-clients-consommateurs)
11. [Conteneurisation Docker](#11-conteneurisation-docker)
12. [Installation et démarrage](#12-installation-et-démarrage)
13. [Guide de démonstration](#13-guide-de-démonstration)
14. [Stack technique](#14-stack-technique)

---

## 1. Contexte et problématique

Les grandes villes africaines comme **Dakar** font face à des défis environnementaux croissants :

- **Pollution de l'air** — particules fines PM2.5, émissions de CO₂ en hausse
- **Inondations** — bassins de rétention saturés lors des saisons des pluies
- **Canicules urbaines** — températures extrêmes dans les quartiers densément peuplés
- **Nuisances sonores** — axes routiers et zones industrielles sans monitoring

Ces problèmes existent sans infrastructure centralisée permettant aux gestionnaires urbains de **détecter**, **réagir** et **anticiper** en temps réel.

---

## 2. Solution proposée

**SenCity** est une plateforme IoT de surveillance environnementale urbaine construite selon les principes de l'**Architecture Orientée Services (SOA)**.

Des capteurs déployés dans les quartiers de Dakar (Plateau, Médina, Parcelles Assainies, Almadies, Grand Dakar) mesurent en continu :

| Indicateur | Unité | Seuil Warning | Seuil Critique |
|---|---|---|---|
| Température | °C | > 38 | > 42 |
| Humidité | % | > 85 | > 95 |
| Qualité de l'air (AQI) | indice | > 100 | > 150 |
| Niveau sonore | dB | > 70 | > 85 |
| Niveau d'eau | cm | > 50 | > 80 |

Les données remontent vers la plateforme, sont analysées automatiquement, et déclenchent des **notifications push** sur l'application mobile Flutter des gestionnaires dès qu'un seuil critique est franchi.

---

## 3. Architecture SOA

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS CONSOMMATEURS                       │
│                                                                     │
│   ┌──────────────────┐              ┌──────────────────┐           │
│   │  Dashboard React  │              │   App Flutter    │           │
│   │  Vite + Chart.js  │              │  Notifications   │           │
│   │  port 3000        │              │  (natif)         │           │
│   └────────┬─────────┘              └────────┬─────────┘           │
│            │ HTTP/REST                        │ HTTP/REST            │
└────────────┼─────────────────────────────────┼─────────────────────┘
             │                                  │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BUS DE SERVICES — API GATEWAY                    │
│                        Nginx · port 8080                            │
│                                                                     │
│   /api/registry        →  Registre SOA des services                │
│   /api/surveillance/*  →  Service Surveillance                      │
│   /api/incidents/*     →  Service Incidents                         │
│   /api/reporting/*     →  Service Reporting                         │
└──────┬────────────────────────┬──────────────────────┬─────────────┘
       │                        │                       │
       ▼                        ▼                       ▼
┌──────────────┐    ┌───────────────────┐   ┌─────────────────────┐
│   Service    │◄───│  Service          │   │  Service            │
│ Surveillance │    │  Incidents        │   │  Reporting          │
│              │◄───│                   │   │                     │
│ PHP 8.3      │    │  PHP 8.3          │   │  PHP 8.3            │
│ port :8001   │    │  port :8002       │   │  port :8003         │
└──────────────┘    └───────────────────┘   └─────────────────────┘
       │                    │                        │
       └────────────────────┴────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BASE DE DONNÉES PARTAGÉE                          │
│                   PostgreSQL · port 5432                            │
│                                                                     │
│   schéma : surveillance  │  schéma : incidents  │  schéma: reporting│
└─────────────────────────────────────────────────────────────────────┘
```

### Composition de services (SOA)

```
App Flutter / Dashboard
        │
        ▼
   API Gateway
        │
        ▼
  Service Incidents ──── GET /mesures/dernieres ────► Service Surveillance
        │                                                      │
        │  applique les règles métier                  retourne mesures
        │  sur les données reçues                      des capteurs
        ▼
  détecte dépassement de seuil
        │
        ▼
  crée incident dans incidents.db
        │
        ▼
  notifie App Flutter (polling)
```

---

## 4. Les 7 principes SOA appliqués

### 1. Contrat standardisé
Chaque service publie un contrat **OpenAPI 3.0** accessible sur `/api-docs`. Ce contrat définit formellement les endpoints, les types de données attendus, les codes de retour et les exemples. Aucune communication n'est possible sans passer par ce contrat.

### 2. Couplage faible
Les services Incidents et Reporting ne connaissent du service Surveillance que son **URL et son contrat**. Ils ne partagent aucun code, aucune classe, aucune logique interne. Si l'implémentation du service Surveillance change (autre langage, autre logique), les autres services ne sont pas affectés tant que le contrat reste identique.

### 3. Abstraction
Les clients (React, Flutter, simulateur) ne connaissent que l'adresse de la Gateway : `http://localhost:8080`. Ils ignorent combien de services existent, comment ils sont implémentés, et sur quels ports ils tournent. La Gateway est l'unique point d'entrée — c'est l'ESB (Enterprise Service Bus) simplifié.

### 4. Réutilisabilité
Le Service de Surveillance est consommé par **trois consommateurs différents** sans aucune modification : le Service Incidents (composition), le Service Reporting (composition), et directement par le Dashboard React et l'App Flutter via la Gateway. Un même service, plusieurs consommateurs.

### 5. Autonomie
Chaque service PHP tourne dans son **propre conteneur Docker** avec son propre processus et ses propres variables d'environnement. Il peut être redémarré, mis à jour ou remplacé indépendamment sans affecter les autres. Le couplage au niveau déploiement est nul.

### 6. Sans état (Stateless)
Chaque requête HTTP est **complète et autonome**. Aucun état de session n'est maintenu côté serveur. Toutes les informations nécessaires au traitement sont contenues dans la requête elle-même (paramètres, corps JSON). Cela permet la scalabilité horizontale.

### 7. Découvrabilité
La Gateway expose un endpoint **`/api/registry`** — le registre SOA. Il liste en temps réel les services disponibles, leurs URLs de contrat OpenAPI, leurs dépendances et leur statut de santé. Un consommateur peut interroger ce registre pour découvrir dynamiquement les services disponibles.

---

## 5. Structure du projet

```
sencity/
│
├── docker-compose.yml              # Orchestration complète
├── README.md
│
├── gateway/                        # Bus de services (Nginx)
│   └── nginx.conf                  # Routing + registre
│
├── services/
│   ├── surveillance/               # Service Surveillance
│   │   ├── Dockerfile
│   │   ├── index.php               # Front controller
│   │   ├── router.php
│   │   ├── openapi.yaml            # Contrat OpenAPI 3.0
│   │   ├── routes/api.php
│   │   ├── src/
│   │   │   ├── Core/               # Request, Response, Router, DB
│   │   │   └── Controllers/        # MesureController, CapteurController
│   │   └── database/
│   │       └── migrations.sql      # Schéma PostgreSQL
│   │
│   ├── incidents/                  # Service Incidents
│   │   ├── Dockerfile
│   │   ├── index.php
│   │   ├── router.php
│   │   ├── openapi.yaml
│   │   ├── routes/api.php
│   │   ├── src/
│   │   │   ├── Core/
│   │   │   └── Controllers/        # IncidentController, AbonnementController
│   │   └── database/
│   │       └── migrations.sql
│   │
│   └── reporting/                  # Service Reporting
│       ├── Dockerfile
│       ├── index.php
│       ├── router.php
│       ├── openapi.yaml
│       ├── routes/api.php
│       ├── src/
│       │   ├── Core/
│       │   └── Controllers/        # RapportController, StatistiqueController
│       └── database/
│           └── migrations.sql
│
├── simulateur/                     # Injecteur de données IoT
│   ├── Dockerfile
│   └── simulate.php                # Envoie POST toutes les 5s
│
├── dashboard/                      # Client React (Vite)
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── MapQuartiers.jsx     # Carte Leaflet
│       │   ├── GraphiqueTemps.jsx   # Chart.js temps réel
│       │   ├── ListeIncidents.jsx
│       │   └── RegistreServices.jsx # Affiche /api/registry
│       └── services/
│           └── api.js              # Appels REST centralisés
│
└── mobile/                         # Client Flutter
    ├── pubspec.yaml
    └── lib/
        ├── main.dart
        ├── services/
        │   └── api_service.dart    # Polling + appels REST
        ├── screens/
        │   ├── dashboard_screen.dart
        │   └── incidents_screen.dart
        └── utils/
            └── notification_service.dart  # flutter_local_notifications
```

---

## 6. Services et contrats

### Service Surveillance — `http://localhost:8080/api/surveillance`

**Responsabilité** : Ingestion et consultation des mesures environnementales. C'est le service **fournisseur de données** — il est consommé par tous les autres.

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/mesures` | Ingérer une mesure (capteur → service) |
| `GET` | `/mesures` | Lister les mesures (`?quartier=&type=&limit=&depuis=`) |
| `GET` | `/mesures/{id}` | Détail d'une mesure |
| `GET` | `/mesures/dernieres` | Dernières mesures par capteur (pour composition) |
| `GET` | `/capteurs` | Catalogue des capteurs enregistrés |
| `GET` | `/capteurs/{id}` | Statut d'un capteur |
| `GET` | `/health` | Disponibilité du service |
| `GET` | `/api-docs` | Contrat OpenAPI 3.0 |

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

**Exemple de réponse :**
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
    "timestamp": "2026-01-15T14:32:00Z"
  }
}
```

---

### Service Incidents — `http://localhost:8080/api/incidents`

**Responsabilité** : Surveillance des seuils, génération d'incidents, gestion des abonnements de notification. Ce service **compose** le Service Surveillance — il l'appelle en interne pour obtenir les dernières mesures.

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/incidents` | Liste des incidents (`?statut=actif&quartier=&severite=`) |
| `GET` | `/incidents/{id}` | Détail d'un incident |
| `PUT` | `/incidents/{id}/resoudre` | Marquer un incident comme résolu |
| `GET` | `/regles` | Consulter les seuils de détection |
| `PUT` | `/regles/{type}` | Modifier un seuil |
| `POST` | `/abonnements` | S'abonner aux notifications (token Flutter) |
| `DELETE` | `/abonnements/{token}` | Se désabonner |
| `POST` | `/verifier` | Déclencher une vérification manuelle des seuils |
| `GET` | `/health` | Disponibilité du service |
| `GET` | `/api-docs` | Contrat OpenAPI 3.0 |

**Exemple d'incident généré :**
```json
{
  "id": 38,
  "capteur_id": "CAP-PLATEAU-001",
  "quartier": "Plateau",
  "type": "temperature",
  "valeur_mesuree": 43.1,
  "seuil_depasse": 42,
  "severite": "critique",
  "statut": "actif",
  "message": "Température critique détectée au Plateau : 43.1°C",
  "cree_le": "2026-01-15T14:32:00Z"
}
```

---

### Service Reporting — `http://localhost:8080/api/reporting`

**Responsabilité** : Agrégation, statistiques et rapports décisionnels. Ce service **compose** également le Service Surveillance pour construire ses analyses sans dupliquer les données.

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/rapport/temps-reel` | État actuel de tous les quartiers |
| `GET` | `/rapport/statistiques` | Moyennes, min/max par type et quartier |
| `GET` | `/rapport/historique` | Évolution sur une période (`?debut=&fin=&quartier=`) |
| `GET` | `/rapport/tendances` | Comparaison 24h / 7 jours |
| `GET` | `/rapport/export` | Export CSV (`?periode=7j&quartier=`) |
| `GET` | `/health` | Disponibilité du service |
| `GET` | `/api-docs` | Contrat OpenAPI 3.0 |

**Exemple de réponse statistiques :**
```json
{
  "periode": "24h",
  "quartiers": [
    {
      "nom": "Plateau",
      "temperature": { "moyenne": 37.4, "min": 31.2, "max": 43.1 },
      "aqi":         { "moyenne": 89,   "min": 45,   "max": 167  },
      "incidents":   3
    }
  ]
}
```

---

## 7. Base de données partagée PostgreSQL

En SOA, les services partagent **une seule base de données** mais chacun possède son propre **schéma logique**. Un service n'accède jamais aux tables d'un autre service directement — il passe obligatoirement par son contrat de service.

### Schémas et tables

```sql
-- ── Schéma Surveillance ─────────────────────────────────────────────
CREATE SCHEMA surveillance;

CREATE TABLE surveillance.capteurs (
    id          SERIAL PRIMARY KEY,
    capteur_id  VARCHAR(50) UNIQUE NOT NULL,
    quartier    VARCHAR(100) NOT NULL,
    latitude    DECIMAL(9,6),
    longitude   DECIMAL(9,6),
    actif       BOOLEAN DEFAULT TRUE,
    enregistre_le TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE surveillance.mesures (
    id          SERIAL PRIMARY KEY,
    capteur_id  VARCHAR(50) NOT NULL,
    quartier    VARCHAR(100) NOT NULL,
    type        VARCHAR(50) NOT NULL,  -- temperature, humidite, aqi, bruit, eau
    valeur      DECIMAL(10,2) NOT NULL,
    unite       VARCHAR(20),
    timestamp   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Schéma Incidents ────────────────────────────────────────────────
CREATE SCHEMA incidents;

CREATE TABLE incidents.incidents (
    id              SERIAL PRIMARY KEY,
    capteur_id      VARCHAR(50) NOT NULL,
    quartier        VARCHAR(100) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    valeur_mesuree  DECIMAL(10,2) NOT NULL,
    seuil_depasse   DECIMAL(10,2) NOT NULL,
    severite        VARCHAR(20) NOT NULL,  -- warning, critique
    statut          VARCHAR(20) DEFAULT 'actif',
    message         TEXT,
    cree_le         TIMESTAMPTZ DEFAULT NOW(),
    resolu_le       TIMESTAMPTZ
);

CREATE TABLE incidents.regles (
    type            VARCHAR(50) PRIMARY KEY,
    seuil_warning   DECIMAL(10,2) NOT NULL,
    seuil_critique  DECIMAL(10,2) NOT NULL,
    unite           VARCHAR(20)
);

CREATE TABLE incidents.abonnements (
    token       VARCHAR(255) PRIMARY KEY,
    plateforme  VARCHAR(20) DEFAULT 'flutter',
    cree_le     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Schéma Reporting ────────────────────────────────────────────────
CREATE SCHEMA reporting;

CREATE TABLE reporting.rapports_cache (
    id          SERIAL PRIMARY KEY,
    type        VARCHAR(50) NOT NULL,
    parametres  JSONB,
    resultat    JSONB NOT NULL,
    genere_le   TIMESTAMPTZ DEFAULT NOW(),
    expire_le   TIMESTAMPTZ
);
```

### Accès par service (utilisateurs PostgreSQL)

Chaque service se connecte avec un utilisateur PostgreSQL dédié qui n'a accès **qu'à son propre schéma** :

```sql
-- Utilisateur du service surveillance
CREATE USER svc_surveillance WITH PASSWORD 'surv_pass';
GRANT ALL ON SCHEMA surveillance TO svc_surveillance;
GRANT ALL ON ALL TABLES IN SCHEMA surveillance TO svc_surveillance;

-- Utilisateur du service incidents
CREATE USER svc_incidents WITH PASSWORD 'inc_pass';
GRANT ALL ON SCHEMA incidents TO svc_incidents;
GRANT ALL ON ALL TABLES IN SCHEMA incidents TO svc_incidents;

-- Utilisateur du service reporting
CREATE USER svc_reporting WITH PASSWORD 'rep_pass';
GRANT ALL ON SCHEMA reporting TO svc_reporting;
GRANT ALL ON ALL TABLES IN SCHEMA reporting TO svc_reporting;
```

---

## 8. Composition de services

La **composition de services** est un principe fondamental de la SOA. Elle signifie qu'un service peut orchestrer d'autres services pour accomplir un processus métier plus complexe.

### Service Incidents → compose → Service Surveillance

Le Service Incidents ne stocke pas les mesures. Pour vérifier si un seuil est dépassé, il interroge le Service Surveillance via son contrat :

```
POST /api/incidents/verifier
         │
         ▼
Service Incidents appelle :
GET http://surveillance:8001/mesures/dernieres
         │
         ▼
Reçoit les mesures des 5 dernières minutes
         │
         ▼
Applique les règles (seuils) de la table incidents.regles
         │
         ├── Seuil OK → aucune action
         └── Seuil dépassé → INSERT dans incidents.incidents
                              → notifie les tokens Flutter abonnés
```

### Service Reporting → compose → Service Surveillance

```
GET /api/reporting/rapport/statistiques
         │
         ▼
Service Reporting appelle :
GET http://surveillance:8001/mesures?limit=1000&depuis=24h
         │
         ▼
Calcule les agrégats (moyenne, min, max, tendances)
         │
         ▼
Met en cache dans reporting.rapports_cache
         │
         ▼
Retourne le rapport au client
```

---

## 9. Registre de services

Le registre est accessible sur `http://localhost:8080/api/registry`. Il liste en temps réel les services disponibles, leurs contrats et leurs statuts.

```json
{
  "registry": {
    "version": "1.0.0",
    "timestamp": "2026-01-15T14:32:00Z",
    "services": [
      {
        "id":          "surveillance",
        "nom":         "Service de Surveillance",
        "description": "Collecte et exposition des mesures environnementales",
        "url_interne": "http://surveillance:8001",
        "contrat":     "http://localhost:8080/api/surveillance/api-docs",
        "statut":      "disponible",
        "version":     "1.0.0",
        "dependances": [],
        "endpoints":   7
      },
      {
        "id":          "incidents",
        "nom":         "Service de Gestion des Incidents",
        "description": "Détection des anomalies, alertes et notifications",
        "url_interne": "http://incidents:8002",
        "contrat":     "http://localhost:8080/api/incidents/api-docs",
        "statut":      "disponible",
        "version":     "1.0.0",
        "dependances": ["surveillance"],
        "endpoints":   9
      },
      {
        "id":          "reporting",
        "nom":         "Service de Reporting",
        "description": "Agrégation, statistiques et rapports décisionnels",
        "url_interne": "http://reporting:8003",
        "contrat":     "http://localhost:8080/api/reporting/api-docs",
        "statut":      "disponible",
        "version":     "1.0.0",
        "dependances": ["surveillance"],
        "endpoints":   6
      }
    ]
  }
}
```

---

## 10. Clients consommateurs

### Dashboard React (Vite)

Le dashboard est une **Single Page Application** React construite avec Vite. Il consomme les 3 services via la Gateway.

**Fonctionnalités :**
- **Carte interactive** (Leaflet) — affiche les 5 quartiers avec indicateurs colorés (vert/orange/rouge selon les seuils)
- **Graphiques temps réel** (Chart.js) — courbes des mesures des dernières 24h par type
- **Liste des incidents** — incidents actifs avec severité et possibilité de résolution
- **Registre des services** — affiche l'état des 3 services en temps réel (`/api/registry`)
- **Rafraîchissement automatique** toutes les 10 secondes

**Accès :** `http://localhost:3000`

### Application Flutter

L'application mobile consomme les services REST directement via la Gateway. Elle tourne **hors Docker** (buildée nativement sur la machine de développement).

**Fonctionnalités :**
- **Écran Dashboard** — métriques clés de chaque quartier
- **Écran Incidents** — liste des incidents avec détails et statuts
- **Notifications locales** — déclenchées automatiquement quand un nouvel incident critique apparaît
- **Polling** — interroge `/api/incidents?statut=actif` toutes les 10 secondes

**Packages Flutter utilisés :**
```yaml
dependencies:
  http: ^1.2.0
  flutter_local_notifications: ^17.0.0
  fl_chart: ^0.68.0
```

**Configuration de l'URL de l'API** dans `lib/services/api_service.dart` :
```dart
// Android émulateur
static const String baseUrl = 'http://10.0.2.2:8080';

// iPhone simulateur ou device réel sur le même réseau
// static const String baseUrl = 'http://192.168.1.X:8080';
```

---

## 11. Conteneurisation Docker

L'ensemble du backend et du dashboard web tourne dans des **conteneurs Docker** orchestrés par Docker Compose.

### Vue d'ensemble des conteneurs

| Conteneur | Image | Port exposé | Rôle |
|---|---|---|---|
| `sc-postgres` | `postgres:16-alpine` | `5432` | Base de données partagée |
| `sc-gateway` | `nginx:alpine` | `8080` | Bus de services / ESB |
| `sc-surveillance` | `php:8.3-cli-alpine` | interne `:8001` | Service Surveillance |
| `sc-incidents` | `php:8.3-cli-alpine` | interne `:8002` | Service Incidents |
| `sc-reporting` | `php:8.3-cli-alpine` | interne `:8003` | Service Reporting |
| `sc-dashboard` | `node:20-alpine` | `3000` | Dashboard React |
| `sc-simulateur` | `php:8.3-cli-alpine` | — | Injecteur de données |

### docker-compose.yml (structure)

```yaml
version: "3.9"

networks:
  sencity-net:
    driver: bridge

volumes:
  postgres-data:

services:

  postgres:
    image: postgres:16-alpine
    container_name: sc-postgres
    environment:
      POSTGRES_DB:       sencity
      POSTGRES_USER:     admin
      POSTGRES_PASSWORD: sencity2026
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - sencity-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d sencity"]
      interval: 10s
      timeout: 5s
      retries: 5

  gateway:
    image: nginx:alpine
    container_name: sc-gateway
    ports:
      - "8080:80"
    volumes:
      - ./gateway/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      surveillance:
        condition: service_healthy
      incidents:
        condition: service_healthy
      reporting:
        condition: service_healthy
    networks:
      - sencity-net
    restart: unless-stopped

  surveillance:
    build: ./services/surveillance
    container_name: sc-surveillance
    environment:
      DB_HOST:     postgres
      DB_PORT:     5432
      DB_NAME:     sencity
      DB_USER:     svc_surveillance
      DB_PASSWORD: surv_pass
      DB_SCHEMA:   surveillance
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - sencity-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "php", "-r", "exit(file_get_contents('http://localhost:8001/health')?0:1);"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

  incidents:
    build: ./services/incidents
    container_name: sc-incidents
    environment:
      DB_HOST:          postgres
      DB_PORT:          5432
      DB_NAME:          sencity
      DB_USER:          svc_incidents
      DB_PASSWORD:      inc_pass
      DB_SCHEMA:        incidents
      SURVEILLANCE_URL: http://surveillance:8001
    depends_on:
      postgres:
        condition: service_healthy
      surveillance:
        condition: service_healthy
    networks:
      - sencity-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "php", "-r", "exit(file_get_contents('http://localhost:8002/health')?0:1);"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

  reporting:
    build: ./services/reporting
    container_name: sc-reporting
    environment:
      DB_HOST:          postgres
      DB_PORT:          5432
      DB_NAME:          sencity
      DB_USER:          svc_reporting
      DB_PASSWORD:      rep_pass
      DB_SCHEMA:        reporting
      SURVEILLANCE_URL: http://surveillance:8001
    depends_on:
      postgres:
        condition: service_healthy
      surveillance:
        condition: service_healthy
    networks:
      - sencity-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "php", "-r", "exit(file_get_contents('http://localhost:8003/health')?0:1);"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

  dashboard:
    build: ./dashboard
    container_name: sc-dashboard
    ports:
      - "3000:80"
    networks:
      - sencity-net
    restart: unless-stopped

  simulateur:
    build: ./simulateur
    container_name: sc-simulateur
    environment:
      GATEWAY_URL:       http://gateway:80
      INTERVAL_SECONDS:  5
    depends_on:
      - gateway
    networks:
      - sencity-net
    restart: unless-stopped
```

### Dockerfile PHP (même base pour les 3 services)

```dockerfile
FROM php:8.3-cli-alpine

# Extension PostgreSQL
RUN apk add --no-cache postgresql-dev \
 && docker-php-ext-install pdo pdo_pgsql

WORKDIR /app
COPY . .

EXPOSE 8001
CMD ["php", "-S", "0.0.0.0:8001", "router.php"]
```

### Dockerfile React (dashboard)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 12. Installation et démarrage

### Prérequis

- Docker Desktop (ou Docker Engine + Docker Compose)
- Flutter SDK (pour l'app mobile uniquement)
- Git

### Démarrage du backend et dashboard

```bash
# 1. Cloner le projet
git clone https://github.com/Falilou66/sencity.git
cd sencity

# 2. Démarrer tous les conteneurs
docker-compose up --build

# 3. Vérifier que tout tourne
docker-compose ps
```

Les services sont disponibles après 15-20 secondes (attente que PostgreSQL soit prêt).

| URL | Description |
|---|---|
| `http://localhost:3000` | Dashboard React |
| `http://localhost:8080/api/registry` | Registre SOA |
| `http://localhost:8080/api/surveillance/health` | Santé Service Surveillance |
| `http://localhost:8080/api/incidents/health` | Santé Service Incidents |
| `http://localhost:8080/api/reporting/health` | Santé Service Reporting |
| `http://localhost:8080/api/surveillance/api-docs` | Contrat OpenAPI Surveillance |
| `http://localhost:8080/api/incidents/api-docs` | Contrat OpenAPI Incidents |
| `http://localhost:8080/api/reporting/api-docs` | Contrat OpenAPI Reporting |

### Démarrage de l'app Flutter

```bash
# Dans un terminal séparé
cd mobile
flutter pub get
flutter run
```

> Sur émulateur Android, l'API est accessible via `http://10.0.2.2:8080`.
> Sur device réel, remplacer par l'IP locale de ta machine.

### Commandes utiles

```bash
# Voir les logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f surveillance

# Redémarrer un seul service
docker-compose restart incidents

# Arrêter un service (pour tester la résilience)
docker-compose stop surveillance

# Tout arrêter et nettoyer
docker-compose down -v
```

---

## 13. Guide de démonstration

Voici l'ordre recommandé pour la soutenance, conçu pour montrer chaque principe SOA en action.

### Étape 1 — Démarrage (1 commande)
```bash
docker-compose up --build
```
Montrer les 7 conteneurs qui démarrent, les healthchecks qui passent au vert, PostgreSQL qui s'initialise avec les schémas.

### Étape 2 — Registre SOA
```bash
curl http://localhost:8080/api/registry | python3 -m json.tool
```
Montrer les 3 services, leurs dépendances, leurs contrats OpenAPI. C'est la **découvrabilité**.

### Étape 3 — Contrats OpenAPI
Ouvrir dans le navigateur :
- `http://localhost:8080/api/surveillance/api-docs`
- `http://localhost:8080/api/incidents/api-docs`

Montrer que chaque service a un contrat formel — c'est le **contrat standardisé**.

### Étape 4 — Simulation en temps réel
Le simulateur tourne déjà. Ouvrir `http://localhost:3000` et montrer les graphiques qui se mettent à jour toutes les 5 secondes.

### Étape 5 — Composition de services
```bash
curl -X POST http://localhost:8080/api/incidents/verifier
```
Déclencher une vérification manuelle. Dans les logs, montrer que le Service Incidents appelle le Service Surveillance en interne — c'est la **composition**.

### Étape 6 — Déclenchement d'une alerte
Injecter manuellement une mesure critique :
```bash
curl -X POST http://localhost:8080/api/surveillance/mesures \
  -H "Content-Type: application/json" \
  -d '{
    "capteur_id": "CAP-PLATEAU-001",
    "quartier":   "Plateau",
    "type":       "temperature",
    "valeur":     45.0,
    "unite":      "°C"
  }'
```
Montrer l'incident qui apparaît sur le dashboard ET la notification qui arrive sur le téléphone Flutter.

### Étape 7 — Résilience (le coup de grâce)
```bash
docker-compose stop surveillance
curl http://localhost:8080/api/incidents/health
```
Montrer que le Service Incidents répond toujours avec son propre statut, et que la Gateway retourne un message d'erreur propre (503) au lieu de crasher. Redémarrer :
```bash
docker-compose start surveillance
```
Le service reprend sans intervention.

---

## 14. Stack technique

| Couche | Technologie | Justification SOA |
|---|---|---|
| Services REST | PHP 8.3 (sans framework) | Contrats explicites, maîtrise totale du code |
| Contrats | OpenAPI 3.0 (`openapi.yaml`) | Standard industriel de description de services |
| Bus de services | Nginx (ESB léger) | Routing, logging centralisé, registre |
| Base de données | PostgreSQL 16 (schémas) | Base partagée SOA, isolation par schéma et utilisateur |
| Conteneurisation | Docker + Docker Compose | Autonomie des services, démarrage en 1 commande |
| Client web | React (Vite) + Chart.js + Leaflet | SPA moderne, consomme les services via contrat |
| Client mobile | Flutter | Notifications locales, polling REST |
| Simulateur | PHP CLI | Génère des mesures réalistes pour la démo |

---

*SenCity — Projet AOS · Master 1 SI/SR · UADB SATIC · 2026*