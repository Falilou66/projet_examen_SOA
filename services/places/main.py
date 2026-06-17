import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth_middleware import jwt_middleware

# ── Métadonnées Swagger ──────────────────────────────────────
tags_metadata = [
    {
        "name": "Santé",
        "description": "Vérification de disponibilité du service.",
    },
    {
        "name": "Zones",
        "description": "Consultation des zones du parking (A, B, C) avec statistiques d'occupation.",
    },
    {
        "name": "Places",
        "description": (
            "Gestion individuelle des 45 places de stationnement. "
            "Permet de lister, consulter, occuper et libérer chaque place."
        ),
    },
    {
        "name": "Statistiques",
        "description": "Agrégats globaux : nombre de places libres, taux d'occupation, etc.",
    },
]

app = FastAPI(
    title="SmartParking — Service Places",
    description="""
## Rôle dans l'architecture SOA

Ce service est le **référentiel unique** de l'état physique du parking.
Il est consulté et modifié par le **Service Transactions** lors de chaque entrée/sortie.

## Plan du parking

| Zone | Places | Type | Tarif |
|------|--------|------|-------|
| **A** | A01–A20 (20 places) | Standard | 500 FCFA/h |
| **B** | B01–B12 standard + B13–B15 PMR (15 places) | Mixte | 500 FCFA/h |
| **C** | C01–C10 (10 places) | VIP | 1 000 FCFA/h |

## Statuts d'une place

- `libre` — disponible pour un nouveau véhicule
- `occupe` — un véhicule est stationné (contient la plaque et l'heure d'arrivée)
- `hors_service` — indisponible (maintenance, réservation, etc.)

## Composition de services

Le Service Transactions appelle :
- `GET /places/disponibles` pour trouver une place avant une entrée
- `PUT /places/{code}/occuper` lors de l'enregistrement d'une entrée
- `PUT /places/{code}/liberer` lors de l'enregistrement d'une sortie
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
        user=os.getenv("DB_USER", "svc_places"),
        password=os.getenv("DB_PASSWORD", "places_pass"),
        options=f"-c search_path={os.getenv('DB_SCHEMA', 'places')}",
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def serialize(row: dict) -> dict:
    result = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, Decimal):
            result[k] = float(v)
        else:
            result[k] = v
    return result


def ok(data, status: int = 200):
    return JSONResponse(status_code=status, content={"success": True, "data": data})


# ── Santé ────────────────────────────────────────────────────

@app.get(
    "/health",
    tags=["Santé"],
    summary="Vérification de disponibilité",
    response_description="Statut du service et horodatage",
)
def health():
    """Retourne `disponible` si le service fonctionne correctement."""
    return ok({"status": "disponible", "service": "places", "version": "1.0.0",
               "timestamp": datetime.now(timezone.utc).isoformat()})


# ── Statistiques ─────────────────────────────────────────────

@app.get(
    "/stats",
    tags=["Statistiques"],
    summary="Statistiques globales d'occupation",
    response_description="Nombre total, libres, occupées, hors service et taux",
)
def stats():
    """
    Retourne un résumé agrégé de l'ensemble des 45 places :
    - `total` : nombre total de places
    - `libres` : places disponibles
    - `occupees` : places actuellement utilisées
    - `hors_service` : places indisponibles
    - `taux_occupation` : pourcentage d'occupation (0–100)
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(*)                                         AS total,
                    COUNT(*) FILTER (WHERE statut = 'libre')        AS libres,
                    COUNT(*) FILTER (WHERE statut = 'occupe')       AS occupees,
                    COUNT(*) FILTER (WHERE statut = 'hors_service') AS hors_service,
                    ROUND(
                        COUNT(*) FILTER (WHERE statut = 'occupe') * 100.0
                        / NULLIF(COUNT(*), 0), 1
                    )                                                AS taux_occupation
                FROM places
            """)
            return ok(serialize(dict(cur.fetchone())))
    finally:
        conn.close()


# ── Zones ────────────────────────────────────────────────────

@app.get(
    "/zones",
    tags=["Zones"],
    summary="Liste des zones avec occupation en temps réel",
    response_description="Tableau des zones A, B, C avec leurs métriques",
)
def list_zones():
    """
    Retourne les 3 zones du parking avec, pour chacune :
    - `total_places` / `places_libres` / `places_occupees`
    - `taux_occupation` calculé en temps réel
    - `tarif_horaire` en FCFA
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT z.id, z.code, z.nom, z.tarif_horaire,
                       COUNT(p.id)                                        AS total_places,
                       COUNT(p.id) FILTER (WHERE p.statut = 'libre')     AS places_libres,
                       COUNT(p.id) FILTER (WHERE p.statut = 'occupe')    AS places_occupees,
                       ROUND(
                           COUNT(p.id) FILTER (WHERE p.statut = 'occupe') * 100.0
                           / NULLIF(COUNT(p.id), 0), 1
                       )                                                  AS taux_occupation
                FROM zones z
                LEFT JOIN places p ON p.zone_code = z.code
                GROUP BY z.id, z.code, z.nom, z.tarif_horaire
                ORDER BY z.code
            """)
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


# ── Places ───────────────────────────────────────────────────

@app.get(
    "/places/disponibles",
    tags=["Places"],
    summary="Places libres (optionnel : filtrer par zone)",
    response_description="Liste des places avec statut='libre'",
)
def places_disponibles(
    zone: Optional[str] = None,
):
    """
    Retourne toutes les places libres.

    - **zone** *(optionnel)* : `A`, `B` ou `C` pour filtrer par zone

    Utilisé par le Service Transactions avant d'enregistrer une entrée.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if zone:
                cur.execute(
                    "SELECT * FROM places WHERE statut = 'libre' AND zone_code = %s ORDER BY code",
                    (zone,),
                )
            else:
                cur.execute("SELECT * FROM places WHERE statut = 'libre' ORDER BY zone_code, code")
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.get(
    "/places",
    tags=["Places"],
    summary="Liste complète des places (filtres disponibles)",
)
def list_places(
    zone: Optional[str] = None,
    statut: Optional[str] = None,
    type: Optional[str] = None,
):
    """
    Liste toutes les places avec filtres optionnels :
    - **zone** : `A`, `B` ou `C`
    - **statut** : `libre`, `occupe` ou `hors_service`
    - **type** : `standard`, `handicape` ou `vip`
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            conditions, params = [], []
            if zone:
                conditions.append("zone_code = %s"); params.append(zone)
            if statut:
                conditions.append("statut = %s"); params.append(statut)
            if type:
                conditions.append("type = %s"); params.append(type)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cur.execute(f"SELECT * FROM places {where} ORDER BY zone_code, code", params)
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.get(
    "/places/{code}",
    tags=["Places"],
    summary="Détail d'une place par son code (ex : A05, C01)",
)
def get_place(code: str):
    """
    Retourne l'état complet d'une place identifiée par son code unique.
    Si la place est occupée, retourne aussi la plaque et l'heure d'occupation.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM places WHERE code = %s", (code,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, f"Place {code} non trouvée")
            return ok(serialize(dict(row)))
    finally:
        conn.close()


class OccuperIn(BaseModel):
    plaque: str

    model_config = {
        "json_schema_extra": {
            "example": {"plaque": "DK-1234-A"}
        }
    }


@app.put(
    "/places/{code}/occuper",
    tags=["Places"],
    summary="Marquer une place comme occupée",
    response_description="Place mise à jour avec la plaque et l'heure d'occupation",
)
def occuper_place(code: str, body: OccuperIn):
    """
    Passe le statut de la place de `libre` à `occupe`.
    Enregistre la plaque du véhicule et l'heure courante.

    **Erreurs possibles :**
    - `404` : place introuvable
    - `409` : place déjà occupée ou hors service

    Appelé automatiquement par le Service Transactions lors d'une entrée.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM places WHERE code = %s FOR UPDATE", (code,))
            place = cur.fetchone()
            if not place:
                raise HTTPException(404, f"Place {code} non trouvée")
            if place["statut"] == "occupe":
                raise HTTPException(409, f"Place {code} déjà occupée")
            if place["statut"] == "hors_service":
                raise HTTPException(409, f"Place {code} hors service")
            cur.execute(
                "UPDATE places SET statut = 'occupe', plaque = %s, occupe_le = NOW() "
                "WHERE code = %s RETURNING *",
                (body.plaque, code),
            )
            row = serialize(dict(cur.fetchone()))
            conn.commit()
            return ok(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()


@app.put(
    "/places/{code}/liberer",
    tags=["Places"],
    summary="Libérer une place occupée",
    response_description="Place remise à statut 'libre'",
)
def liberer_place(code: str):
    """
    Passe le statut de la place de `occupe` à `libre`.
    Efface la plaque et l'heure d'occupation.

    Appelé automatiquement par le Service Transactions lors d'une sortie.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE places SET statut = 'libre', plaque = NULL, occupe_le = NULL "
                "WHERE code = %s AND statut = 'occupe' RETURNING *",
                (code,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, f"Place {code} non trouvée ou déjà libre")
            conn.commit()
            return ok(serialize(dict(row)))
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()
