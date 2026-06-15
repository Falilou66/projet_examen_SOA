import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import httpx
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

SURVEILLANCE_URL = os.getenv("SURVEILLANCE_URL", "http://surveillance:8001")

app = FastAPI(title="Service Incidents", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(HTTPException)
async def http_exc(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": exc.detail})


def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "postgres"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "sencity"),
        user=os.getenv("DB_USER", "svc_incidents"),
        password=os.getenv("DB_PASSWORD", "inc_pass"),
        options=f"-c search_path={os.getenv('DB_SCHEMA', 'incidents')}",
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


@app.get("/health")
def health():
    return ok({"status": "disponible", "service": "incidents", "version": "1.0.0",
               "timestamp": datetime.now(timezone.utc).isoformat()})


@app.get("/api-docs")
def api_docs():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


@app.get("/incidents")
def list_incidents(
    statut: Optional[str] = None,
    quartier: Optional[str] = None,
    severite: Optional[str] = None,
):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            conditions, params = [], []
            if statut:
                conditions.append("statut = %s"); params.append(statut)
            if quartier:
                conditions.append("quartier = %s"); params.append(quartier)
            if severite:
                conditions.append("severite = %s"); params.append(severite)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cur.execute(f"SELECT * FROM incidents {where} ORDER BY cree_le DESC LIMIT 100", params)
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.get("/incidents/{incident_id}")
def get_incident(incident_id: int):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM incidents WHERE id = %s", (incident_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Incident non trouvé")
            return ok(serialize(dict(row)))
    finally:
        conn.close()


@app.put("/incidents/{incident_id}/resoudre")
def resoudre(incident_id: int):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE incidents SET statut = 'resolu', resolu_le = NOW() "
                "WHERE id = %s AND statut = 'actif' RETURNING *",
                (incident_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Incident non trouvé ou déjà résolu")
            conn.commit()
            return ok(serialize(dict(row)))
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()


@app.get("/regles")
def list_regles():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM regles ORDER BY type")
            return ok([dict(r) for r in cur.fetchall()])
    finally:
        conn.close()


class RegleIn(BaseModel):
    seuil_warning: float
    seuil_critique: float


@app.put("/regles/{type_name}")
def update_regle(type_name: str, body: RegleIn):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE regles SET seuil_warning = %s, seuil_critique = %s "
                "WHERE type = %s RETURNING *",
                (body.seuil_warning, body.seuil_critique, type_name),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Règle non trouvée")
            conn.commit()
            return ok(dict(row))
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()


class AbonnementIn(BaseModel):
    token: str
    plateforme: str = "flutter"


@app.post("/abonnements")
def create_abonnement(body: AbonnementIn):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO abonnements (token, plateforme) VALUES (%s, %s) "
                "ON CONFLICT (token) DO UPDATE SET plateforme = EXCLUDED.plateforme RETURNING *",
                (body.token, body.plateforme),
            )
            row = serialize(dict(cur.fetchone()))
            conn.commit()
            return ok(row, 201)
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()


@app.delete("/abonnements/{token}")
def delete_abonnement(token: str):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM abonnements WHERE token = %s", (token,))
            conn.commit()
            return ok({"message": "Désabonnement effectué"})
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()


@app.post("/verifier")
def verifier():
    try:
        resp = httpx.get(f"{SURVEILLANCE_URL}/mesures/dernieres", timeout=5.0)
        resp.raise_for_status()
        mesures = resp.json().get("data", [])
    except Exception:
        raise HTTPException(503, "Service Surveillance inaccessible")

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM regles")
            regles = {r["type"]: r for r in cur.fetchall()}

            incidents_crees = []
            for m in mesures:
                type_ = m["type"]
                regle = regles.get(type_)
                if not regle:
                    continue

                valeur = float(m["valeur"])
                if valeur > float(regle["seuil_critique"]):
                    severite, seuil = "critique", float(regle["seuil_critique"])
                elif valeur > float(regle["seuil_warning"]):
                    severite, seuil = "warning", float(regle["seuil_warning"])
                else:
                    continue

                cur.execute(
                    "SELECT id FROM incidents WHERE capteur_id = %s AND type = %s AND statut = 'actif' LIMIT 1",
                    (m["capteur_id"], type_),
                )
                if cur.fetchone():
                    continue

                message = (
                    f"{severite.capitalize()} {type_} détecté(e) à {m['quartier']} : "
                    f"{valeur:.1f} {m.get('unite', '')} (seuil: {seuil:.1f})"
                )
                cur.execute(
                    "INSERT INTO incidents "
                    "(capteur_id, quartier, type, valeur_mesuree, seuil_depasse, severite, message) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *",
                    (m["capteur_id"], m["quartier"], type_, valeur, seuil, severite, message),
                )
                incidents_crees.append(serialize(dict(cur.fetchone())))

            conn.commit()
            return ok({
                "mesures_verifiees": len(mesures),
                "incidents_crees": len(incidents_crees),
                "incidents": incidents_crees,
            })
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()
