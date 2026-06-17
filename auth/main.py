"""
Service d'authentification SOA — SmartParking
Émet des tokens JWT et expose le registre des consommateurs/fournisseurs.
"""
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

JWT_SECRET  = os.getenv("JWT_SECRET", "smartparking-soa-2026-secret")
ALGORITHM   = "HS256"
TOKEN_HOURS = int(os.getenv("TOKEN_HOURS", "8"))

# ── Consommateurs enregistrés ─────────────────────────────────
USERS = {
    "admin": {"password": "admin2026", "name": "Administrateur",  "role": "admin"},
    "agent": {"password": "agent2026", "name": "Agent Parking",   "role": "agent"},
    "demo":  {"password": "demo",      "name": "Visiteur Demo",   "role": "viewer"},
    "simul": {"password": "simul2026", "name": "Simulateur PHP",  "role": "agent"},
}

# ── Droits par rôle ───────────────────────────────────────────
ROLES_PERMISSIONS = {
    "admin":  ["read", "write", "admin"],
    "agent":  ["read", "write"],
    "viewer": ["read"],
}

# ── Registre SOA enrichi ──────────────────────────────────────
REGISTRY = {
    "version":       "2.0.0",
    "plateforme":    "SmartParking Dakar — SOA Platform",
    "auth_endpoint": "/api/auth/login",
    "security":      "JWT HS256 — Authorization: Bearer <token>",
    "token_ttl":     f"{TOKEN_HOURS}h",
    "consommateurs": {
        "admin":  {"nom": "Administrateur",  "permissions": ROLES_PERMISSIONS["admin"]},
        "agent":  {"nom": "Agent Parking",   "permissions": ROLES_PERMISSIONS["agent"]},
        "viewer": {"nom": "Visiteur Demo",   "permissions": ROLES_PERMISSIONS["viewer"]},
        "simul":  {"nom": "Simulateur PHP",  "permissions": ROLES_PERMISSIONS["agent"]},
    },
    "services": [
        {
            "id":          "auth",
            "nom":         "Service Auth",
            "description": "Émission de tokens JWT — gestion des consommateurs SOA",
            "port":        8000,
            "gateway":     "/api/auth",
            "health":      "/api/auth/health",
            "contrat":     "/api/auth/docs",
            "open":        ["/health", "/login"],
            "permissions": {"login": "public", "consumers": ["admin"], "registry": "public"},
        },
        {
            "id":          "places",
            "nom":         "Service Places",
            "description": "Gestion des 45 places et des zones A/B/C",
            "port":        8001,
            "gateway":     "/api/places",
            "health":      "/api/places/health",
            "contrat":     "/api/places/docs",
            "open":        ["/health"],
            "permissions": {
                "GET":  ["admin", "agent", "viewer"],
                "PUT":  ["admin", "agent"],
            },
            "dependances": [],
        },
        {
            "id":          "transactions",
            "nom":         "Service Transactions",
            "description": "Cycle de vie des stationnements — facturation — alertes",
            "port":        8002,
            "gateway":     "/api/transactions",
            "health":      "/api/transactions/health",
            "contrat":     "/api/transactions/docs",
            "open":        ["/health"],
            "permissions": {
                "GET":  ["admin", "agent", "viewer"],
                "POST": ["admin", "agent"],
                "PUT":  ["admin", "agent"],
            },
            "dependances": ["places"],
        },
        {
            "id":          "reporting",
            "nom":         "Service Reporting",
            "description": "Agrégats, statistiques et exports CSV",
            "port":        8003,
            "gateway":     "/api/reporting",
            "health":      "/api/reporting/health",
            "contrat":     "/api/reporting/docs",
            "open":        ["/health"],
            "permissions": {
                "GET": ["admin", "agent", "viewer"],
            },
            "dependances": ["places", "transactions"],
        },
    ],
}

app = FastAPI(
    title="SmartParking — Service Auth",
    description="""
## Rôle SOA

Point d'entrée unique pour **l'authentification et l'autorisation** de la plateforme.
Tous les consommateurs (dashboard, simulateur, clients tiers) doivent d'abord
obtenir un **token JWT** via `POST /login` avant d'appeler les services métier.

## Flux d'authentification

```
Consommateur → POST /api/auth/login {username, password}
             ← { token: "eyJ...", role, permissions, expires_in }

Consommateur → GET /api/places/stats
               Header: Authorization: Bearer eyJ...
             ← { success: true, data: {...} }
```

## Rôles et permissions

| Rôle    | Lecture (GET) | Écriture (POST/PUT) | Admin |
|---------|:---:|:---:|:---:|
| admin   | ✓ | ✓ | ✓ |
| agent   | ✓ | ✓ | — |
| viewer  | ✓ | — | — |
""",
    version="1.0.0",
    contact={"name": "SmartParking SOA", "email": "admin@smartparking.sn"},
    license_info={"name": "Projet Examen SOA — UADB SATIC 2026"},
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(HTTPException)
async def http_exc(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": exc.detail})


def ok(data, status: int = 200):
    return JSONResponse(status_code=status, content={"success": True, "data": data})


def make_token(username: str, role: str) -> dict:
    now     = datetime.now(timezone.utc)
    expires = now + timedelta(hours=TOKEN_HOURS)
    payload = {
        "sub":         username,
        "name":        USERS[username]["name"],
        "role":        role,
        "permissions": ROLES_PERMISSIONS.get(role, ["read"]),
        "iat":         int(now.timestamp()),
        "exp":         int(expires.timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    return {
        "token":       token,
        "type":        "Bearer",
        "expires_in":  TOKEN_HOURS * 3600,
        "expires_at":  expires.isoformat(),
        "username":    username,
        "name":        payload["name"],
        "role":        role,
        "permissions": payload["permissions"],
    }


# ── Endpoints ────────────────────────────────────────────────

@app.get("/health", summary="Santé du service auth")
def health():
    return ok({
        "status":    "disponible",
        "service":   "auth",
        "version":   "1.0.0",
        "algorithm": ALGORITHM,
        "token_ttl": f"{TOKEN_HOURS}h",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


class LoginIn(BaseModel):
    username: str
    password: str
    model_config = {"json_schema_extra": {"example": {"username": "admin", "password": "admin2026"}}}


@app.post("/login", summary="Authentification — obtenir un token JWT")
def login(body: LoginIn):
    """
    Authentifie un consommateur et retourne un **token JWT** valable `{TOKEN_HOURS}h`.

    Le token doit être envoyé dans le header HTTP de chaque requête :
    ```
    Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
    ```
    """
    user = USERS.get(body.username.lower().strip())
    if not user or user["password"] != body.password:
        raise HTTPException(401, "Identifiant ou mot de passe incorrect")
    return ok(make_token(body.username.lower().strip(), user["role"]))


@app.get("/registry", summary="Registre SOA — services, consommateurs et permissions")
def registry():
    """
    Retourne le **registre complet** de la plateforme SOA :
    - Liste des services fournisseurs avec leurs endpoints et permissions
    - Liste des consommateurs et leurs droits
    - Informations de sécurité (endpoint d'auth, algorithme JWT)
    """
    return ok(REGISTRY)


@app.get("/consumers", summary="Liste des consommateurs enregistrés et leurs droits")
def consumers():
    """Retourne la liste publique des consommateurs (sans mots de passe)."""
    return ok({
        k: {"nom": v["nom"], "permissions": v["permissions"]}
        for k, v in REGISTRY["consommateurs"].items()
    })


@app.post("/verify", summary="Vérifier la validité d'un token JWT")
def verify(request: Request):
    """Valide un token JWT et retourne son contenu décodé."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(400, "Header Authorization: Bearer <token> requis")
    try:
        payload = jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=[ALGORITHM])
        return ok({"valid": True, "payload": payload})
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expiré")
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, f"Token invalide : {e}")
