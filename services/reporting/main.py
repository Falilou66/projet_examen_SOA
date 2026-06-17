import io
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

import httpx
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from auth_middleware import jwt_middleware

PLACES_URL       = os.getenv("PLACES_URL",       "http://places:8001")
TRANSACTIONS_URL = os.getenv("TRANSACTIONS_URL",  "http://transactions:8002")

# ── Métadonnées Swagger ──────────────────────────────────────
tags_metadata = [
    {
        "name": "Santé",
        "description": "Vérification de disponibilité du service.",
    },
    {
        "name": "Rapports",
        "description": (
            "Rapports agrégés construits par composition avec les services Places et Transactions. "
            "Occupation en temps réel, revenus par période, statistiques et tendances horaires."
        ),
    },
    {
        "name": "Export",
        "description": "Téléchargement des données brutes au format CSV.",
    },
]

app = FastAPI(
    title="SmartParking — Service Reporting",
    description="""
## Rôle dans l'architecture SOA

Ce service est un **agrégateur sans état** : il ne stocke pas de données métier.
Il compose les données des deux autres services pour produire des rapports décisionnels.

```
GET /rapport/occupation
  └─ GET http://places:8001/stats
  └─ GET http://places:8001/zones

GET /rapport/revenus?periode=semaine
  └─ GET http://transactions:8002/transactions?statut=terminee&depuis=...

GET /rapport/statistiques
  └─ GET http://transactions:8002/transactions
  └─ GET http://places:8001/stats

GET /rapport/tendances
  └─ GET http://transactions:8002/transactions (dernières 24h)

GET /rapport/export
  └─ GET http://transactions:8002/transactions → CSV
```

## Périodes disponibles

| Paramètre | Description |
|-----------|-------------|
| `aujourd_hui` | Depuis minuit (par défaut) |
| `semaine` | 7 derniers jours |
| `mois` | 30 derniers jours |
""",
    version="1.0.0",
    openapi_tags=tags_metadata,
    contact={"name": "SmartParking SOA", "email": "admin@smartparking.sn"},
    license_info={"name": "Projet Examen SOA — UADB SATIC"},
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*", "Authorization"])
app.add_middleware(BaseHTTPMiddleware, dispatch=jwt_middleware)


@app.exception_handler(HTTPException)
async def http_exc(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": exc.detail})


def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "postgres"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "sencity"),
        user=os.getenv("DB_USER", "svc_reporting"),
        password=os.getenv("DB_PASSWORD", "rep_pass"),
        options=f"-c search_path={os.getenv('DB_SCHEMA', 'reporting')}",
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def fetch(base_url: str, path: str, params: dict = None) -> dict:
    try:
        resp = httpx.get(f"{base_url}{path}", params=params, timeout=10.0)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return {"success": False, "data": None}


def dt_str(dt: datetime) -> str:
    """Formate en ISO sans offset timezone (+00:00) qui casse l'encodage URL."""
    return dt.strftime('%Y-%m-%dT%H:%M:%S')


def ok(data, status: int = 200):
    return JSONResponse(status_code=status, content={"success": True, "data": data})


# ── Santé ────────────────────────────────────────────────────

@app.get("/health", tags=["Santé"], summary="Vérification de disponibilité")
def health():
    """Retourne `disponible` si le service fonctionne correctement."""
    return ok({"status": "disponible", "service": "reporting", "version": "1.0.0",
               "timestamp": datetime.now(timezone.utc).isoformat()})


# ── Rapports ─────────────────────────────────────────────────

@app.get(
    "/rapport/occupation",
    tags=["Rapports"],
    summary="Occupation en temps réel (global + par zone)",
    response_description="Statistiques globales et détail par zone A/B/C",
)
def occupation():
    """
    Agrège les données d'occupation du Service Places :
    - Vue globale : total, libres, occupées, taux
    - Vue par zone : même métriques pour A, B et C séparément
    """
    stats = fetch(PLACES_URL, "/stats").get("data") or {}
    zones = fetch(PLACES_URL, "/zones").get("data") or []
    return ok({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "global": stats,
        "zones": zones,
    })


@app.get(
    "/rapport/revenus",
    tags=["Rapports"],
    summary="Revenus par période, zone et type de véhicule",
    response_description="Total en FCFA, ventilé par zone et par type",
)
def revenus(
    periode: str = "aujourd_hui",
):
    """
    Calcule les revenus générés sur la période choisie.

    Ventilation :
    - `par_zone` : revenus Zone A, B, C
    - `par_type_vehicule` : revenus voiture / moto / camion

    Seules les transactions avec `statut='terminee'` sont comptabilisées.
    """
    now = datetime.now(timezone.utc)
    if periode == "aujourd_hui":
        depuis = dt_str(now.replace(hour=0, minute=0, second=0, microsecond=0))
    elif periode == "semaine":
        depuis = dt_str(now - timedelta(days=7))
    elif periode == "mois":
        depuis = dt_str(now - timedelta(days=30))
    else:
        depuis = dt_str(now.replace(hour=0, minute=0, second=0, microsecond=0))

    txs = fetch(TRANSACTIONS_URL, "/transactions",
                params={"statut": "terminee", "depuis": depuis, "limit": 1000}).get("data") or []

    total = sum(float(t.get("montant_fcfa") or 0) for t in txs)
    par_zone: dict = {}
    par_type: dict = {}
    for t in txs:
        z = t.get("zone_code", "?")
        tv = t.get("type_vehicule", "?")
        par_zone[z]  = par_zone.get(z, 0)  + float(t.get("montant_fcfa") or 0)
        par_type[tv] = par_type.get(tv, 0) + float(t.get("montant_fcfa") or 0)

    return ok({
        "periode": periode,
        "depuis": depuis,
        "total_fcfa": round(total, 2),
        "nb_transactions": len(txs),
        "par_zone": par_zone,
        "par_type_vehicule": par_type,
    })


@app.get(
    "/rapport/statistiques",
    tags=["Rapports"],
    summary="Statistiques opérationnelles (entrées, sorties, durée moyenne, revenus)",
)
def statistiques(
    periode: str = "aujourd_hui",
):
    """
    Rapport opérationnel complet pour la période choisie :

    - `nb_entrees` : nombre de véhicules entrés
    - `nb_sorties` : nombre de véhicules sortis (transactions terminées)
    - `duree_moyenne_minutes` : durée moyenne de stationnement
    - `revenus_fcfa` : total facturé sur la période
    - `occupation_actuelle` : snapshot de l'occupation en temps réel
    """
    now = datetime.now(timezone.utc)
    heures = {"aujourd_hui": 24, "semaine": 168, "mois": 720}.get(periode, 24)
    depuis = dt_str(now - timedelta(hours=heures))

    txs = fetch(TRANSACTIONS_URL, "/transactions",
                params={"depuis": depuis, "limit": 1000}).get("data") or []

    nb_entrees    = len([t for t in txs if t.get("statut") in ("en_cours", "terminee")])
    nb_sorties    = len([t for t in txs if t.get("statut") == "terminee"])
    durees        = [t.get("duree_minutes") or 0 for t in txs if t.get("duree_minutes")]
    duree_moy     = round(sum(durees) / len(durees), 1) if durees else 0
    revenus_total = sum(float(t.get("montant_fcfa") or 0) for t in txs if t.get("statut") == "terminee")

    occupation = fetch(PLACES_URL, "/stats").get("data") or {}

    return ok({
        "periode": periode,
        "nb_entrees": nb_entrees,
        "nb_sorties": nb_sorties,
        "duree_moyenne_minutes": duree_moy,
        "revenus_fcfa": round(revenus_total, 2),
        "occupation_actuelle": occupation,
    })


@app.get(
    "/rapport/tendances",
    tags=["Rapports"],
    summary="Fréquentation par heure sur les dernières 24h",
    response_description="Nombre d'entrées par heure (0–23) et heure de pointe",
)
def tendances():
    """
    Analyse la distribution des entrées sur les 24 dernières heures.

    Retourne :
    - `transactions_par_heure` : dict {0: n, 1: n, ..., 23: n}
    - `heure_pointe` : heure avec le plus de trafic
    - `nb_heure_pointe` : nombre de transactions à cette heure
    """
    depuis = dt_str(datetime.now(timezone.utc) - timedelta(hours=24))
    txs = fetch(TRANSACTIONS_URL, "/transactions",
                params={"depuis": depuis, "limit": 1000}).get("data") or []

    par_heure: dict = {h: 0 for h in range(24)}
    for t in txs:
        entree_str = t.get("entree_le")
        if entree_str:
            try:
                heure = datetime.fromisoformat(entree_str).hour
                par_heure[heure] += 1
            except Exception:
                pass

    heure_pointe = max(par_heure, key=par_heure.get)
    return ok({
        "transactions_par_heure": par_heure,
        "heure_pointe": heure_pointe,
        "nb_heure_pointe": par_heure[heure_pointe],
    })


# ── Export ────────────────────────────────────────────────────

@app.get(
    "/rapport/export",
    tags=["Export"],
    summary="Exporter les transactions en CSV",
    response_description="Fichier CSV téléchargeable",
)
def export(
    periode: str = "aujourd_hui",
):
    """
    Génère et télécharge un fichier CSV contenant toutes les transactions
    de la période choisie.

    **Colonnes :** id, reference, plaque, type_vehicule, place_code, zone_code,
    entree_le, sortie_le, duree_minutes, montant_fcfa, statut

    Le fichier est nommé `smartparking-{periode}-{date}.csv`.
    """
    now = datetime.now(timezone.utc)
    jours = {"aujourd_hui": 1, "semaine": 7, "mois": 30}.get(periode, 1)
    depuis = dt_str(now - timedelta(days=jours))

    txs = fetch(TRANSACTIONS_URL, "/transactions",
                params={"depuis": depuis, "limit": 2000}).get("data") or []

    lines = ["id,reference,plaque,type_vehicule,place_code,zone_code,"
             "entree_le,sortie_le,duree_minutes,montant_fcfa,statut"]
    for t in txs:
        lines.append(
            f"{t.get('id','')},{t.get('reference','')},{t.get('plaque','')},"
            f"{t.get('type_vehicule','')},{t.get('place_code','')},{t.get('zone_code','')},"
            f"{t.get('entree_le','')},{t.get('sortie_le','')},{t.get('duree_minutes','') or ''},"
            f"{t.get('montant_fcfa','') or ''},{t.get('statut','')}"
        )

    content = "\n".join(lines).encode()
    filename = f"smartparking-{periode}-{datetime.now().strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
