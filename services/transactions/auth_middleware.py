"""
Middleware JWT — SmartParking SOA
Valide le token Bearer sur chaque requête et contrôle les droits par méthode HTTP.
"""
import os
import jwt
from fastapi import Request
from fastapi.responses import JSONResponse

JWT_SECRET = os.getenv("JWT_SECRET", "smartparking-soa-2026-secret")
ALGORITHM  = "HS256"

# Chemins exemptés d'authentification
OPEN_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


def err(status: int, message: str):
    return JSONResponse(status_code=status, content={"success": False, "error": message})


async def jwt_middleware(request: Request, call_next):
    path = request.scope.get("path", request.url.path)
    # scope["path"] est la route brute (/health), request.url.path inclut root_path
    if path in OPEN_PATHS or any(path.endswith(p) for p in OPEN_PATHS):
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return err(401, "Token JWT requis — Authorization: Bearer <token>")

    try:
        payload = jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        return err(401, "Token expiré — veuillez vous reconnecter")
    except jwt.InvalidTokenError as e:
        return err(401, f"Token invalide : {e}")

    permissions = payload.get("permissions", [])
    method = request.method.upper()

    if method in ("POST", "PUT", "DELETE", "PATCH"):
        if "write" not in permissions:
            return err(403, (
                f"Accès refusé — rôle '{payload.get('role')}' "
                f"dispose uniquement des droits en lecture"
            ))
    elif "read" not in permissions:
        return err(403, "Accès refusé — droits insuffisants")

    request.state.user = payload
    response = await call_next(request)
    response.headers["X-Auth-User"]  = payload.get("sub", "")
    response.headers["X-Auth-Role"]  = payload.get("role", "")
    return response
