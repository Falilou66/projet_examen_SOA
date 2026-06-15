import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="Service Surveillance", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(HTTPException)
async def http_exc(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": exc.detail})


def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "postgres"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "sencity"),
        user=os.getenv("DB_USER", "svc_surveillance"),
        password=os.getenv("DB_PASSWORD", "surv_pass"),
        options=f"-c search_path={os.getenv('DB_SCHEMA', 'surveillance')}",
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


class MesureIn(BaseModel):
    capteur_id: str
    quartier: str
    type: str
    valeur: float
    unite: str


@app.get("/health")
def health():
    return ok({"status": "disponible", "service": "surveillance", "version": "1.0.0",
               "timestamp": datetime.now(timezone.utc).isoformat()})


@app.get("/api-docs")
def api_docs():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


@app.post("/mesures")
def store_mesure(m: MesureIn):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO capteurs (capteur_id, quartier) VALUES (%s, %s) "
                "ON CONFLICT (capteur_id) DO UPDATE SET quartier = EXCLUDED.quartier",
                (m.capteur_id, m.quartier),
            )
            cur.execute(
                "INSERT INTO mesures (capteur_id, quartier, type, valeur, unite) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING *",
                (m.capteur_id, m.quartier, m.type, m.valeur, m.unite),
            )
            row = serialize(dict(cur.fetchone()))
            conn.commit()
            return ok(row, 201)
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        conn.close()


@app.get("/mesures/dernieres")
def dernieres():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT ON (capteur_id, type) "
                "id, capteur_id, quartier, type, valeur, unite, timestamp "
                "FROM mesures ORDER BY capteur_id, type, timestamp DESC"
            )
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.get("/mesures")
def list_mesures(
    quartier: Optional[str] = None,
    type: Optional[str] = Query(None),
    depuis: Optional[str] = None,
    limit: int = Query(100, le=1000),
):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            conditions, params = [], []
            if quartier:
                conditions.append("quartier = %s"); params.append(quartier)
            if type:
                conditions.append("type = %s"); params.append(type)
            if depuis:
                conditions.append("timestamp >= %s"); params.append(depuis)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            params.append(limit)
            cur.execute(f"SELECT * FROM mesures {where} ORDER BY timestamp DESC LIMIT %s", params)
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.get("/mesures/{mesure_id}")
def get_mesure(mesure_id: int):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM mesures WHERE id = %s", (mesure_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Mesure non trouvée")
            return ok(serialize(dict(row)))
    finally:
        conn.close()


@app.get("/capteurs")
def list_capteurs():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM capteurs ORDER BY enregistre_le DESC")
            return ok([serialize(dict(r)) for r in cur.fetchall()])
    finally:
        conn.close()


@app.get("/capteurs/{capteur_id}")
def get_capteur(capteur_id: str):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM capteurs WHERE capteur_id = %s", (capteur_id,))
            capteur = cur.fetchone()
            if not capteur:
                raise HTTPException(404, "Capteur non trouvé")
            capteur = serialize(dict(capteur))
            cur.execute(
                "SELECT DISTINCT ON (type) type, valeur, unite, timestamp "
                "FROM mesures WHERE capteur_id = %s ORDER BY type, timestamp DESC",
                (capteur_id,),
            )
            capteur["dernieres_mesures"] = [serialize(dict(r)) for r in cur.fetchall()]
            return ok(capteur)
    finally:
        conn.close()
