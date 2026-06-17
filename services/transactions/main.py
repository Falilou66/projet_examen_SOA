import os
import random
import string
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import httpx
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth_middleware import jwt_middleware

PLACES_URL = os.getenv("PLACES_URL", "http://places:8001")

# ── Métadonnées Swagger ──────────────────────────────────────
tags_metadata = [
    {
        "name": "Santé",
        "description": "Vérification de disponibilité du service.",
    },
    {
        "name": "Tarifs",
        "description": "Consultation de la grille tarifaire par type de véhicule.",
    },
    {
        "name": "Entrées / Sorties",
        "description": (
            "Opérations principales du parking. "
            "`POST /entree` enregistre l'arrivée d'un véhicule. "
            "`POST /sortie` calcule la durée, facture et libère la place."
        ),
    },
    {
        "name": "Transactions",
        "description": "Historique et détail des transactions (en cours et terminées).",
    },
    {
        "name": "Alertes",
        "description": (
            "Alertes générées automatiquement quand le taux d'occupation "
            "d'une zone dépasse 80 % (warning) ou 90 % (critique)."
        ),
    },
]

app = FastAPI(
    title="SmartParking — Service Transactions",
    description="""
## Rôle dans l'architecture SOA

Ce service orchestre le **cycle de vie complet d'un stationnement** :
enregistrement de l'entrée, calcul de la durée et de la facturation,
enregistrement de la sortie, et gestion des alertes de capacité.

Il s'appuie sur le **Service Places** (composition de services SOA) pour
occuper et libérer les places physiques.

## Flux d'une entrée

```
POST /entree
  ├─ GET http://places:8001/places/disponibles?zone=X   → cherche une place libre
  ├─ INSERT transactions (statut: en_cours)
  ├─ PUT http://places:8001/places/{code}/occuper       → marque la place
  └─ Vérifie le taux de zone → crée une alerte si > 80% ou 90%
```

## Flux d'une sortie

```
POST /sortie
  ├─ SELECT transaction en cours (par id ou plaque)
  ├─ Calcule durée et montant (minimum 30 min facturées)
  ├─ UPDATE transaction (statut: terminee, montant_fcfa)
  ├─ PUT http://places:8001/places/{code}/liberer       → libère la place
  └─ Résout les alertes si occupation redescend
```

## Grille tarifaire

| Véhicule | Tarif |
|----------|-------|
| Voiture  | 500 FCFA/heure |
| Moto     | 200 FCFA/heure |
| Camion   | 1 000 FCFA/heure |

> Facturation minimum : **30 minutes**.
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
        user=os.getenv("DB_USER", "svc_transactions"),
        password=os.getenv("DB_PASSWORD", "trans_pass"),
        options=f"-c search_path={os.getenv('DB_SCHEMA', 'transactions')}",
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


def gen_reference() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"TXN-{datetime.now().strftime('%Y%m%d')}-{suffix}"


def call_places(method: str, path: str, json: dict = None):
    try:
        resp = httpx.request(method, f"{PLACES_URL}{path}", json=json, timeout=5.0)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, e.response.json().get("error", str(e)))
    except Exception as e:
        raise HTTPException(503, f"Service Places inaccessible : {e}")


def check_and_create_alert(conn, zone_code: str, taux: float):
    with conn.cursor() as cur:
        if taux >= 90:
            cur.execute(
                "SELECT id FROM alertes WHERE zone_code = %s AND type = 'parking_plein' AND statut = 'active'",
                (zone_code,),
            )
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO alertes (type, zone_code, message, severite) VALUES (%s, %s, %s, %s)",
                    ("parking_plein", zone_code,
                     f"Zone {zone_code} : {taux}% des places occupées — parking quasi plein",
                     "critique"),
                )
        elif taux >= 80:
            cur.execute(
                "SELECT id FROM alertes WHERE zone_code = %s AND type = 'parking_presque_plein' AND statut = 'active'",
                (zone_code,),
            )
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO alertes (type, zone_code, message, severite) VALUES (%s, %s, %s, %s)",
                    ("parking_presque_plein", zone_code,
                     f"Zone {zone_code} : {taux}% des places occupées — parking presque plein",
                     "warning"),
                )
        else:
            cur.execute(
                "UPDATE alertes SET statut = 'resolue', resolue_le = NOW() "
                "WHERE zone_code = %s AND type IN ('parking_plein','parking_presque_plein') AND statut = 'active'",
                (zone_code,),
            )


# ── Santé ────────────────────────────────────────────────────

@app.get("/health", tags=["Santé"], summary="Vérification de disponibilité")
def health():
    """Retourne `disponible` si le service fonctionne correctement."""
    return ok({"status": "disponible", "service": "transactions", "version": "1.0.0",
               "timestamp": datetime.now(timezone.utc).isoformat()})


# ── Tarifs ───────────────────────────────────────────────────

@app.get("/tarifs", tags=["Tarifs"], summary="Grille tarifaire par type de véhicule")
def list_tarifs():
    """
    Retourne le tarif horaire en FCFA pour chaque type de véhicule :
    `voiture`, `moto`, `camion`.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM tarifs ORDER BY type_vehicule")
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


# ── Entrées / Sorties ─────────────────────────────────────────

class EntreeIn(BaseModel):
    plaque: str
    type_vehicule: str = "voiture"
    zone: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "plaque": "DK-1234-A",
                "type_vehicule": "voiture",
                "zone": "A"
            }
        }
    }


@app.post(
    "/entree",
    tags=["Entrées / Sorties"],
    summary="Enregistrer l'entrée d'un véhicule",
    status_code=201,
    response_description="Transaction créée avec la place attribuée",
)
def entree(body: EntreeIn):
    """
    Enregistre l'arrivée d'un véhicule dans le parking.

    1. Interroge le Service Places pour trouver une place libre (dans la zone demandée si précisée)
    2. Vérifie que la plaque n'est pas déjà présente
    3. Crée la transaction avec statut `en_cours`
    4. Marque la place comme occupée dans le Service Places
    5. Génère une alerte si le taux de la zone dépasse 80 % ou 90 %

    **Erreurs possibles :**
    - `409` : aucune place disponible, ou véhicule déjà présent
    - `400` : type de véhicule inconnu
    - `503` : Service Places inaccessible
    """
    dispo = call_places("GET", f"/places/disponibles{'?zone=' + body.zone if body.zone else ''}")
    places_libres = dispo.get("data", [])
    if not places_libres:
        raise HTTPException(409, "Aucune place disponible" + (f" en Zone {body.zone}" if body.zone else ""))

    place = places_libres[0]

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM transactions WHERE plaque = %s AND statut = 'en_cours'",
                (body.plaque,),
            )
            if cur.fetchone():
                raise HTTPException(409, f"Véhicule {body.plaque} déjà dans le parking")

            cur.execute("SELECT tarif_horaire FROM tarifs WHERE type_vehicule = %s", (body.type_vehicule,))
            tarif_row = cur.fetchone()
            if not tarif_row:
                raise HTTPException(400, f"Type de véhicule inconnu : {body.type_vehicule}")

            ref = gen_reference()
            cur.execute(
                "INSERT INTO transactions (reference, plaque, type_vehicule, place_code, zone_code) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING *",
                (ref, body.plaque, body.type_vehicule, place["code"], place["zone_code"]),
            )
            tx = serialize(dict(cur.fetchone()))
            conn.commit()

        call_places("PUT", f"/places/{place['code']}/occuper", {"plaque": body.plaque})

        zones = call_places("GET", "/zones").get("data", [])
        with conn.cursor() as cur:
            for z in zones:
                if z["code"] == place["zone_code"] and z["total_places"]:
                    check_and_create_alert(conn, z["code"], float(z.get("taux_occupation") or 0))
            conn.commit()

        return ok(tx, 201)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()


class SortieIn(BaseModel):
    transaction_id: Optional[int] = None
    plaque: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {"transaction_id": 42}
        }
    }


@app.post(
    "/sortie",
    tags=["Entrées / Sorties"],
    summary="Enregistrer la sortie d'un véhicule et calculer le montant",
    response_description="Transaction clôturée avec durée et montant en FCFA",
)
def sortie(body: SortieIn):
    """
    Enregistre la sortie d'un véhicule.

    - Fournir soit `transaction_id`, soit `plaque`
    - Calcule la durée réelle de stationnement
    - Applique le tarif horaire (minimum facturable : **30 minutes**)
    - Met à jour la transaction avec statut `terminee` et `montant_fcfa`
    - Libère la place dans le Service Places
    - Résout automatiquement les alertes si le taux redescend sous 80 %

    **Formule :** `montant = max(durée_min, 30) / 60 × tarif_horaire`
    """
    if not body.transaction_id and not body.plaque:
        raise HTTPException(400, "transaction_id ou plaque requis")

    conn = get_db()
    try:
        with conn.cursor() as cur:
            if body.transaction_id:
                cur.execute(
                    "SELECT * FROM transactions WHERE id = %s AND statut = 'en_cours'",
                    (body.transaction_id,),
                )
            else:
                cur.execute(
                    "SELECT * FROM transactions WHERE plaque = %s AND statut = 'en_cours' "
                    "ORDER BY entree_le DESC LIMIT 1",
                    (body.plaque,),
                )
            tx = cur.fetchone()
            if not tx:
                raise HTTPException(404, "Transaction en cours non trouvée")
            tx = dict(tx)

            maintenant = datetime.now(timezone.utc)
            entree = tx["entree_le"]
            if entree.tzinfo is None:
                entree = entree.replace(tzinfo=timezone.utc)
            duree_min = int((maintenant - entree).total_seconds() / 60)
            duree_facturee = max(duree_min, 30)

            cur.execute("SELECT tarif_horaire FROM tarifs WHERE type_vehicule = %s", (tx["type_vehicule"],))
            tarif_row = cur.fetchone()
            tarif = float(tarif_row["tarif_horaire"]) if tarif_row else 500
            montant = round(duree_facturee / 60 * tarif, 2)

            cur.execute(
                "UPDATE transactions SET sortie_le = NOW(), duree_minutes = %s, "
                "montant_fcfa = %s, statut = 'terminee' WHERE id = %s RETURNING *",
                (duree_min, montant, tx["id"]),
            )
            tx_final = serialize(dict(cur.fetchone()))
            conn.commit()

        call_places("PUT", f"/places/{tx['place_code']}/liberer")

        zones = call_places("GET", "/zones").get("data", [])
        with conn.cursor() as cur:
            for z in zones:
                if z["code"] == tx["zone_code"]:
                    check_and_create_alert(conn, z["code"], float(z.get("taux_occupation") or 0))
            conn.commit()

        return ok(tx_final)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()


# ── Transactions ──────────────────────────────────────────────

@app.get(
    "/encours",
    tags=["Transactions"],
    summary="Véhicules actuellement stationnés",
    response_description="Transactions avec statut 'en_cours' et durée actuelle calculée",
)
def encours():
    """
    Retourne toutes les transactions actives avec un champ supplémentaire
    `duree_minutes_actuelle` calculé à l'instant de la requête.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT *, "
                "EXTRACT(EPOCH FROM (NOW() - entree_le))/60 AS duree_minutes_actuelle "
                "FROM transactions WHERE statut = 'en_cours' ORDER BY entree_le DESC"
            )
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.get(
    "/transactions",
    tags=["Transactions"],
    summary="Historique des transactions (filtres disponibles)",
)
def list_transactions(
    statut: Optional[str] = None,
    plaque: Optional[str] = None,
    zone: Optional[str] = None,
    depuis: Optional[str] = None,
    limit: int = 100,
):
    """
    Retourne l'historique paginé des transactions.

    **Filtres :**
    - **statut** : `en_cours`, `terminee` ou `annulee`
    - **plaque** : recherche partielle insensible à la casse
    - **zone** : `A`, `B` ou `C`
    - **depuis** : date ISO 8601 (ex: `2026-06-15T00:00:00Z`)
    - **limit** : nombre max de résultats (défaut 100)
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            conditions, params = [], []
            if statut:
                conditions.append("statut = %s"); params.append(statut)
            if plaque:
                conditions.append("plaque ILIKE %s"); params.append(f"%{plaque}%")
            if zone:
                conditions.append("zone_code = %s"); params.append(zone)
            if depuis:
                conditions.append("entree_le >= %s"); params.append(depuis)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            params.append(limit)
            cur.execute(f"SELECT * FROM transactions {where} ORDER BY entree_le DESC LIMIT %s", params)
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.get(
    "/transactions/{tx_id}",
    tags=["Transactions"],
    summary="Détail d'une transaction par son identifiant",
)
def get_transaction(tx_id: int):
    """Retourne tous les champs d'une transaction (entrée, sortie, durée, montant, etc.)."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM transactions WHERE id = %s", (tx_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Transaction non trouvée")
            return ok(serialize(dict(row)))
    finally:
        conn.close()


# ── Alertes ───────────────────────────────────────────────────

@app.get(
    "/alertes",
    tags=["Alertes"],
    summary="Liste des alertes (par défaut : actives uniquement)",
)
def list_alertes(
    statut: Optional[str] = "active",
):
    """
    Retourne les alertes de capacité du parking.

    - **statut=active** *(défaut)* : alertes non résolues
    - **statut=resolue** : alertes passées
    - **statut=toutes** : toutes les alertes (50 dernières)

    Les alertes sont créées automatiquement par `POST /entree`
    lorsque le taux dépasse 80 % (warning) ou 90 % (critique).
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if statut and statut != "toutes":
                cur.execute(
                    "SELECT * FROM alertes WHERE statut = %s ORDER BY cree_le DESC",
                    (statut,),
                )
            else:
                cur.execute("SELECT * FROM alertes ORDER BY cree_le DESC LIMIT 50")
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.put(
    "/alertes/{alerte_id}/resoudre",
    tags=["Alertes"],
    summary="Résoudre manuellement une alerte active",
)
def resoudre_alerte(alerte_id: int):
    """
    Passe le statut d'une alerte de `active` à `resolue`.
    Enregistre l'horodatage de résolution.

    Les alertes sont aussi résolues automatiquement par `POST /sortie`
    si le taux d'occupation repasse sous 80 %.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE alertes SET statut = 'resolue', resolue_le = NOW() "
                "WHERE id = %s AND statut = 'active' RETURNING *",
                (alerte_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Alerte non trouvée ou déjà résolue")
            conn.commit()
            return ok(serialize(dict(row)))
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()
